import * as pdfjsLib from 'pdfjs-dist'
import type { Chunk, HighlightRect } from '../types'

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
): HighlightRect {
  const t = pdfjsLib.Util.transform(viewport.transform, item.transform)
  const fontHeight = Math.hypot(t[2], t[3]) || item.height
  const widthScale = Math.hypot(t[0], t[1]) || 1
  const width = item.width * widthScale
  return {
    left: t[4],
    top: t[5] - fontHeight,
    width,
    height: fontHeight,
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

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = viewports[pageNum]
    if (!viewport) continue
    const map = await buildPageMap(page)
    const perChunk: { chunkId: string; rects: HighlightRect[] }[] = []

    for (const chunk of chunks) {
      const needle = normalize(chunk.text)
      const span = findRange(map.text, needle)
      if (!span) continue
      const hit = map.ranges.filter(
        (r) => r.end > span.start && r.start < span.end,
      )
      if (!hit.length) continue
      const rects = hit.map((r) => rectForItem(r.item, viewport))
      perChunk.push({ chunkId: chunk.id, rects })
    }

    if (perChunk.length) result[pageNum] = perChunk
  }

  return result
}
