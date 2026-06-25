import type { DragEvent } from 'react'
import type { PdfSource } from '../types'

interface SourceItemProps {
  source: PdfSource
  depth: number
  onToggleSelect: (id: string) => void
  onMove: (nodeId: string, targetFolderId: string | null) => void
}

const INDENT = 14

export default function SourceItem({ source, depth, onToggleSelect }: SourceItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/source-id', source.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex h-7 cursor-grab items-center gap-1.5 rounded px-1 text-sm hover:bg-gray-100"
      style={{ paddingLeft: depth * INDENT + 22 }}
      title={`${source.name} · ${source.pages} pages`}
    >
      <input
        type="checkbox"
        checked={source.selected}
        onChange={() => onToggleSelect(source.id)}
        className="h-3.5 w-3.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      <svg
        className="h-3.5 w-3.5 shrink-0 text-rose-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-gray-800">{source.name}</span>
      <span className="shrink-0 text-[11px] text-gray-400 group-hover:text-gray-500">
        {source.pages}p
      </span>
    </div>
  )
}
