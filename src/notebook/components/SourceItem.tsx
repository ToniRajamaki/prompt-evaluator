import type { DragEvent } from 'react'
import type { PdfSource, SourceKind } from '../types'

interface SourceItemProps {
  source: PdfSource
  depth: number
  active: boolean
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onMove: (nodeId: string, targetFolderId: string | null) => void
}

const INDENT = 14

const iconColor: Record<SourceKind, string> = {
  pdf: 'text-rose-500',
  md: 'text-sky-500',
  txt: 'text-gray-500',
}

export default function SourceItem({
  source,
  depth,
  active,
  onSelect,
  onToggleSelect,
}: SourceItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/source-id', source.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(source.id)}
      className={`group flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition ${
        active
          ? 'bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-100'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      style={{ paddingLeft: depth * INDENT + 22 }}
      title={source.name}
    >
      <svg
        className={`h-3.5 w-3.5 shrink-0 ${iconColor[source.kind]}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="min-w-0 flex-1 truncate">{source.name}</span>
      <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] font-medium uppercase text-gray-400 group-hover:text-gray-500">
        {source.kind}
      </span>
      {source.selected ? (
        <button
          type="button"
          title="Remove from context"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(source.id)
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          title="Add to context"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(source.id)
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-indigo-100 hover:text-indigo-600 group-hover:opacity-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  )
}
