import type { Chunk, ChunkSet } from '../types'
import { colorFor } from '../data/chunksRegistry'

interface ChunksPanelProps {
  chunkSet: ChunkSet
  hoveredChunkId: string | null
  activeChunkId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
}

export default function ChunksPanel({
  chunkSet,
  hoveredChunkId,
  activeChunkId,
  onHover,
  onSelect,
}: ChunksPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Chunks</h2>
            <p className="text-xs text-gray-500">
              {chunkSet.chunks.length} chunks · {chunkSet.method}
            </p>
          </div>
          {activeChunkId && (
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-900"
              onClick={() => onSelect(null)}
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-500">
          <Badge>size {String(chunkSet.params.chunkSize ?? '?')}</Badge>
          <Badge>overlap {String(chunkSet.params.chunkOverlap ?? '?')}</Badge>
          <Badge>page {chunkSet.page}</Badge>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {chunkSet.chunks.map((chunk, idx) => (
          <ChunkCard
            key={chunk.id}
            chunk={chunk}
            index={idx}
            isHovered={hoveredChunkId === chunk.id}
            isActive={activeChunkId === chunk.id}
            isDimmed={
              (!!hoveredChunkId && hoveredChunkId !== chunk.id) ||
              (!!activeChunkId && activeChunkId !== chunk.id && !hoveredChunkId)
            }
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-gray-200">
      {children}
    </span>
  )
}

interface ChunkCardProps {
  chunk: Chunk
  index: number
  isHovered: boolean
  isActive: boolean
  isDimmed: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
}

function ChunkCard({
  chunk,
  index,
  isHovered,
  isActive,
  isDimmed,
  onHover,
  onSelect,
}: ChunkCardProps) {
  const color = colorFor(index)

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(chunk.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(isActive ? null : chunk.id)}
      style={{
        boxShadow: isActive
          ? `0 0 0 2px ${color.ring}`
          : isHovered
            ? `0 0 0 1px ${color.ring}`
            : undefined,
        opacity: isDimmed ? 0.55 : 1,
      }}
      className={`block w-full rounded-md border border-gray-200 bg-white p-3 text-left transition hover:border-gray-300 ${
        isActive ? 'bg-gray-50' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-gray-900"
            style={{ background: color.bg, boxShadow: `inset 0 0 0 1px ${color.ring}` }}
          >
            {index + 1}
          </span>
          <span className="font-mono text-[10px] text-gray-500">{chunk.id}</span>
        </div>
        <span className="font-mono text-[10px] text-gray-400">
          {chunk.start}–{chunk.end} · {chunk.length}c
        </span>
      </div>
      <p className="line-clamp-3 text-xs leading-relaxed text-gray-700">
        {chunk.text}
      </p>
    </button>
  )
}
