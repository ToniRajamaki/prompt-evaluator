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
  { bg: 'rgba(250, 204, 21, 0.35)', ring: '#eab308', dot: 'bg-yellow-400' }, // yellow
  { bg: 'rgba(96, 165, 250, 0.35)', ring: '#3b82f6', dot: 'bg-blue-400' }, // blue
  { bg: 'rgba(74, 222, 128, 0.35)', ring: '#22c55e', dot: 'bg-green-400' }, // green
  { bg: 'rgba(244, 114, 182, 0.35)', ring: '#ec4899', dot: 'bg-pink-400' }, // pink
  { bg: 'rgba(192, 132, 252, 0.40)', ring: '#a855f7', dot: 'bg-purple-400' }, // purple
  { bg: 'rgba(251, 146, 60, 0.35)', ring: '#f97316', dot: 'bg-orange-400' }, // orange
]

export function colorFor(index: number) {
  return CHUNK_COLORS[index % CHUNK_COLORS.length]
}
