import * as pdfjsLib from 'pdfjs-dist'
import type { Chunk, HighlightRect, NormalizedBox } from '../types'

interface TextItemLike {
  str: string
  width: number
  height: number
  transform: number[]
  hasEOL?: boolean
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

interface ItemRange {
  item: TextItemLike
  start: number
  end: number
}

interface PageMap {
  text: string
  ranges: ItemRange[]
}

function isTextItem(it: unknown): it is TextItemLike {
  return (
    typeof (it as TextItemLike).str === 'string' &&
    Array.isArray((it as TextItemLike).transform)
  )
}

async function buildPageMap(
  page: pdfjsLib.PDFPageProxy,
): Promise<PageMap> {
  const tc = await page.getTextContent()
  const items: TextItemLike[] = (tc.items as unknown[]).filter(isTextItem)

  let text = ''
  const ranges: ItemRange[] = []
  for (const item of items) {
    const norm = normalize(item.str)
    if (!norm) {
      if (item.hasEOL && text && !text.endsWith(' ')) text += ' '
      continue
    }
    if (text && !text.endsWith(' ')) text += ' '
    const start = text.length
    text += norm
    ranges.push({ item, start, end: text.length })
    if (item.hasEOL) text += ' '
  }
  return { text, ranges }
}

function findRange(
  haystack: string,
  needle: string,
): { start: number; end: number } | null {
  if (!needle) return null
  let idx = haystack.indexOf(needle)
  if (idx !== -1) return { start: idx, end: idx + needle.length }

  // Try trimming overlapping prefix/suffix (chunks overlap by ~40 chars).
  for (const trim of [20, 40, 60, 80]) {
    if (needle.length <= trim * 2 + 20) break
    const shorter = needle.slice(trim, needle.length - trim)
    idx = haystack.indexOf(shorter)
    if (idx !== -1) return { start: idx, end: idx + shorter.length }
  }

  // Last resort: try matching the middle 60% of the chunk.
  const mid = Math.floor(needle.length * 0.2)
  const middle = needle.slice(mid, needle.length - mid)
  idx = haystack.indexOf(middle)
  if (idx !== -1) return { start: idx, end: idx + middle.length }
  return null
}

function rectForItem(
  item: TextItemLike,
  viewport: pdfjsLib.PageViewport,
  clipStart = 0,
  clipEnd = 1,
): HighlightRect {
  const t = pdfjsLib.Util.transform(viewport.transform, item.transform)
  const fontHeight = Math.hypot(t[2], t[3]) || item.height
  const widthScale = Math.hypot(t[0], t[1]) || 1
  const fullWidth = item.width * widthScale
  const start = Math.max(0, Math.min(clipStart, 1))
  const end = Math.max(start, Math.min(clipEnd, 1))
  return {
    left: t[4] + fullWidth * start,
    top: t[5] - fontHeight,
    width: fullWidth * (end - start),
    height: fontHeight,
  }
}

/**
 * Merge rects that sit on the same visual text row into a single span. This
 * turns a row of per-glyph/word boxes into one tight highlight bar, which
 * reads far cleaner than dozens of abutting rectangles.
 */
function mergeRectsByLine(rects: HighlightRect[]): HighlightRect[] {
  if (rects.length <= 1) return rects
  const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left)
  const lines: HighlightRect[] = []

  for (const rect of sorted) {
    const last = lines[lines.length - 1]
    const sameLine =
      last &&
      Math.abs(rect.top - last.top) <= Math.max(rect.height, last.height) * 0.6
    if (sameLine) {
      const left = Math.min(last.left, rect.left)
      const right = Math.max(last.left + last.width, rect.left + rect.width)
      const top = Math.min(last.top, rect.top)
      const bottom = Math.max(last.top + last.height, rect.top + rect.height)
      last.left = left
      last.width = right - left
      last.top = top
      last.height = bottom - top
    } else {
      lines.push({ ...rect })
    }
  }
  return lines
}

function rectFromNormalizedBox(
  box: NormalizedBox,
  viewport: pdfjsLib.PageViewport,
): HighlightRect {
  return {
    left: box.x0 * viewport.width,
    top: box.y0 * viewport.height,
    width: (box.x1 - box.x0) * viewport.width,
    height: (box.y1 - box.y0) * viewport.height,
  }
}

export interface ChunkRectsByPage {
  [pageNumber: number]: { chunkId: string; rects: HighlightRect[] }[]
}

export async function computeChunkHighlights(
  pdf: pdfjsLib.PDFDocumentProxy,
  chunks: Chunk[],
  viewports: Record<number, pdfjsLib.PageViewport>,
): Promise<ChunkRectsByPage> {
  const result: ChunkRectsByPage = {}

  // 1) Precomputed normalized boxes (from the offline PDF-parsing pipeline).
  //    These take precedence and need no text matching — just scale to the page.
  for (const chunk of chunks) {
    for (const highlight of chunk.highlights ?? []) {
      const viewport = viewports[highlight.page]
      if (!viewport) continue
      result[highlight.page] ??= []
      result[highlight.page].push({
        chunkId: chunk.id,
        rects: highlight.boxes.map((box) => rectFromNormalizedBox(box, viewport)),
      })
    }
  }

  // 2) Fallback: derive highlights live by matching chunk text against the
  //    PDF's text layer (used by text PDFs that ship without stored boxes).
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = viewports[pageNum]
    if (!viewport) continue
    const map = await buildPageMap(page)
    const perChunk: { chunkId: string; rects: HighlightRect[] }[] = []

    for (const chunk of chunks) {
      if (chunk.highlights?.length) continue
      const needle = normalize(chunk.text)
      const span = findRange(map.text, needle)
      if (!span) continue
      const hit = map.ranges.filter(
        (r) => r.end > span.start && r.start < span.end,
      )
      if (!hit.length) continue
      // Clip the first/last overlapping items to the exact character span so the
      // highlight starts and ends mid-word instead of covering whole items.
      const rects = hit.map((r) => {
        const itemLen = Math.max(1, r.end - r.start)
        const clipStart = r.start < span.start ? (span.start - r.start) / itemLen : 0
        const clipEnd = r.end > span.end ? (span.end - r.start) / itemLen : 1
        return rectForItem(r.item, viewport, clipStart, clipEnd)
      })
      perChunk.push({ chunkId: chunk.id, rects: mergeRectsByLine(rects) })
    }

    if (perChunk.length) result[pageNum] = perChunk
  }

  return result
}
