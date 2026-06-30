import type { Chunk } from '../types'

/**
 * DOM text highlighter for rendered content (markdown) and raw text. Chunk
 * matching is done against a whitespace-normalized projection of the
 * container's text nodes, with a parallel map back to the exact
 * (textNode, offset) positions so highlights land precisely even across
 * inline element boundaries (e.g. **bold**, links).
 */

const MARK_ATTR = 'data-chunk-mark'

interface CharRef {
  node: Text
  offset: number
}

interface NormalizedMap {
  norm: string
  refs: CharRef[]
}

export function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Strip common markdown syntax so chunk text (raw markdown) matches the
 * rendered DOM text, which no longer contains the markup characters.
 */
export function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s{0,3}[-*+]\s+/gm, '') // bullet markers
    .replace(/^\s{0,3}\d+\.\s+/gm, '') // ordered list markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/^\s{0,3}([-*_]\s?){3,}$/gm, ' ') // horizontal rules
}

/**
 * Build a normalized lowercase projection of all text within `container`,
 * skipping text already inside highlight marks, plus a per-character map back
 * to the originating text node and offset.
 */
function buildNormalizedMap(container: HTMLElement): NormalizedMap {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      if (parent?.closest(`[${MARK_ATTR}]`)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let norm = ''
  const refs: CharRef[] = []
  let prevWasSpace = true // collapse leading whitespace

  let current = walker.nextNode() as Text | null
  while (current) {
    const raw = current.data
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      if (/\s/.test(ch)) {
        if (prevWasSpace) continue
        norm += ' '
        refs.push({ node: current, offset: i })
        prevWasSpace = true
      } else {
        norm += ch.toLowerCase()
        refs.push({ node: current, offset: i })
        prevWasSpace = false
      }
    }
    current = walker.nextNode() as Text | null
  }

  // Drop a single trailing collapsed space for clean indexing.
  if (norm.endsWith(' ')) {
    norm = norm.slice(0, -1)
    refs.pop()
  }
  return { norm, refs }
}

/** Find a chunk's normalized text in the haystack, with lenient fallbacks. */
function findNeedle(haystack: string, needle: string): { start: number; end: number } | null {
  if (!needle) return null
  let idx = haystack.indexOf(needle)
  if (idx !== -1) return { start: idx, end: idx + needle.length }

  // Chunks overlap by ~40 chars; trim eroded prefix/suffix.
  for (const trim of [20, 40, 60]) {
    if (needle.length <= trim * 2 + 20) break
    const shorter = needle.slice(trim, needle.length - trim)
    idx = haystack.indexOf(shorter)
    if (idx !== -1) return { start: idx, end: idx + shorter.length }
  }

  const mid = Math.floor(needle.length * 0.2)
  const middle = needle.slice(mid, needle.length - mid)
  if (middle.length > 24) {
    idx = haystack.indexOf(middle)
    if (idx !== -1) return { start: idx, end: idx + middle.length }
  }
  return null
}

/**
 * Group a normalized [start,end) range into contiguous per-text-node ranges so
 * each can be wrapped independently.
 */
function nodeRangesFor(
  refs: CharRef[],
  start: number,
  end: number,
): { node: Text; start: number; end: number }[] {
  const out: { node: Text; start: number; end: number }[] = []
  let i = start
  while (i < end) {
    const ref = refs[i]
    if (!ref) break
    const node = ref.node
    let last = ref.offset
    let j = i + 1
    while (j < end && refs[j]?.node === node) {
      last = refs[j].offset
      j++
    }
    out.push({ node, start: ref.offset, end: last + 1 })
    i = j
  }
  return out
}

export interface ChunkMarkStyle {
  bg: string
  ring: string
}

interface PaintOptions {
  focusedIds: Set<string>
  activeChunkId: string | null
  hoveredChunkId: string | null
  styleFor: (chunk: Chunk) => ChunkMarkStyle
  onChunkClick?: (chunkId: string) => void
  /** Optional transform applied to chunk text before matching (e.g. strip markdown). */
  preprocessNeedle?: (text: string) => string
}

/** Remove all highlight marks, restoring the original text nodes. */
export function clearHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll(`[${MARK_ATTR}]`)
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    if (parent instanceof Element || parent.nodeType === Node.ELEMENT_NODE) {
      ;(parent as Element & { normalize(): void }).normalize()
    }
  })
}

/**
 * Paint highlights for the focused chunks. Only hovered/active chunks are
 * painted to keep the document readable, mirroring the PDF overlay behavior.
 */
export function paintHighlights(
  container: HTMLElement,
  chunks: Chunk[],
  options: PaintOptions,
): void {
  clearHighlights(container)
  if (!options.focusedIds.size) return

  const focused = chunks.filter((c) => options.focusedIds.has(c.id))
  if (!focused.length) return

  // Active painted last so its ring wins where chunks overlap.
  focused.sort((a, b) => {
    const aActive = a.id === options.activeChunkId ? 1 : 0
    const bActive = b.id === options.activeChunkId ? 1 : 0
    return aActive - bActive
  })

  for (const chunk of focused) {
    // Rebuild the map each chunk: prior wraps changed the text node layout.
    const { norm, refs } = buildNormalizedMap(container)
    const raw = options.preprocessNeedle ? options.preprocessNeedle(chunk.text) : chunk.text
    const span = findNeedle(norm, normalizeText(raw))
    if (!span) continue

    const ranges = nodeRangesFor(refs, span.start, span.end)
    const style = options.styleFor(chunk)
    const isActive = chunk.id === options.activeChunkId
    const isHovered = chunk.id === options.hoveredChunkId

    for (const range of ranges) {
      const { node } = range
      const startOffset = Math.max(0, Math.min(range.start, node.data.length))
      const endOffset = Math.max(startOffset, Math.min(range.end, node.data.length))
      if (endOffset <= startOffset) continue

      const domRange = document.createRange()
      domRange.setStart(node, startOffset)
      domRange.setEnd(node, endOffset)

      const mark = document.createElement('mark')
      mark.setAttribute(MARK_ATTR, '')
      mark.setAttribute('data-chunk-id', chunk.id)
      mark.style.backgroundColor = style.bg
      mark.style.color = 'inherit'
      mark.style.borderRadius = '2px'
      mark.style.padding = '0.05em 0'
      mark.style.cursor = 'pointer'
      mark.style.mixBlendMode = 'multiply'
      mark.style.transition = 'box-shadow 120ms ease'
      if (isActive) mark.style.boxShadow = `0 0 0 2px ${style.ring}`
      else if (isHovered) mark.style.boxShadow = `0 0 0 1px ${style.ring}`
      if (options.onChunkClick) {
        mark.addEventListener('click', (e) => {
          e.stopPropagation()
          options.onChunkClick?.(chunk.id)
        })
      }

      try {
        domRange.surroundContents(mark)
      } catch {
        // surroundContents throws if the range partially selects a non-text
        // node; our ranges are within a single text node so this is rare.
      }
    }
  }
}
