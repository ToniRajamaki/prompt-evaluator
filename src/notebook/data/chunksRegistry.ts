import type { ChunkSet } from '../types'

const modules = import.meta.glob('./*.chunks.json', { eager: true }) as Record<
  string,
  { default: ChunkSet }
>

const bySource = new Map<string, ChunkSet>()
for (const mod of Object.values(modules)) {
  const set = mod.default
  bySource.set(set.source.toLowerCase(), set)
}

export function getChunksForFile(fileName: string): ChunkSet | null {
  return bySource.get(fileName.toLowerCase()) ?? null
}

export const CHUNK_COLORS = [
  { bg: 'rgba(250, 204, 21, 0.40)', ring: '#eab308', dot: 'bg-yellow-400' }, // yellow
]

// Yellow-only highlighting everywhere — every chunk uses the same highlighter color.
export function colorFor(_index: number) {
  return CHUNK_COLORS[0]
}
