import type { Chunk, ChunkSet } from './types'

/**
 * Lightweight recursive-character text splitter that mirrors the
 * `recursive-character-splitter` shape used by the prebuilt PDF chunk JSON,
 * so md/txt files can be chunked at runtime while the backend is postponed.
 */

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', '']
const DEFAULT_CHUNK_SIZE = 280
const DEFAULT_CHUNK_OVERLAP = 40

interface ChunkerParams {
  chunkSize: number
  chunkOverlap: number
  separators: string[]
}

function splitRecursive(text: string, separators: string[], chunkSize: number): string[] {
  if (text.length <= chunkSize) return text.length ? [text] : []

  const [sep, ...rest] = separators
  // No separators left: hard-split by size.
  if (sep === undefined) {
    const out: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      out.push(text.slice(i, i + chunkSize))
    }
    return out
  }

  const parts = sep === '' ? text.split('') : text.split(sep)
  const pieces: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const piece = i < parts.length - 1 ? parts[i] + sep : parts[i]
    if (!piece) continue
    if (piece.length > chunkSize) {
      pieces.push(...splitRecursive(piece, rest, chunkSize))
    } else {
      pieces.push(piece)
    }
  }
  return pieces
}

/**
 * Merge the recursively split pieces into chunks <= chunkSize, applying a
 * character overlap between consecutive chunks (matching the JSON params).
 */
function mergePieces(
  pieces: string[],
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const chunks: string[] = []
  let current = ''

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push(trimmed)
  }

  for (const piece of pieces) {
    if (current.length + piece.length > chunkSize && current.length) {
      flush()
      const overlap = chunkOverlap > 0 ? current.slice(-chunkOverlap) : ''
      current = overlap + piece
    } else {
      current += piece
    }
  }
  flush()
  return chunks
}

/**
 * Locate each chunk's character offsets in the source text. Because overlap is
 * derived from the previous chunk's tail, searching forward from the previous
 * match keeps offsets monotonic and accurate.
 */
function locateOffsets(
  fullText: string,
  chunkTexts: string[],
): { start: number; end: number }[] {
  const offsets: { start: number; end: number }[] = []
  let cursor = 0
  for (const text of chunkTexts) {
    const head = text.slice(0, Math.min(text.length, 60))
    let idx = fullText.indexOf(head, Math.max(0, cursor - DEFAULT_CHUNK_OVERLAP))
    if (idx === -1) idx = fullText.indexOf(head)
    if (idx === -1) idx = cursor
    const start = idx
    const end = Math.min(fullText.length, start + text.length)
    offsets.push({ start, end })
    cursor = end
  }
  return offsets
}

export function chunkText(
  fileName: string,
  fullText: string,
  params: Partial<ChunkerParams> = {},
): ChunkSet {
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK_SIZE
  const chunkOverlap = params.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP
  const separators = params.separators ?? DEFAULT_SEPARATORS

  const pieces = splitRecursive(fullText, separators, chunkSize)
  const chunkTexts = mergePieces(pieces, chunkSize, chunkOverlap)
  const offsets = locateOffsets(fullText, chunkTexts)

  const slug = fileName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()

  const chunks: Chunk[] = chunkTexts.map((text, index) => {
    const { start, end } = offsets[index]
    return {
      id: `${slug}-c${String(index + 1).padStart(2, '0')}`,
      index,
      start,
      end,
      length: text.length,
      text,
    }
  })

  return {
    source: fileName,
    page: 1,
    method: 'recursive-character-splitter',
    params: { chunkSize, chunkOverlap, separators },
    chunks,
    fullText,
  }
}
