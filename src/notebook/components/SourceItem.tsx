import type { DragEvent } from 'react'
import type { PdfSource, SourceKind } from '../types'

interface SourceItemProps {
  source: PdfSource
  depth: number
  active: boolean
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onMove: (nodeId: string, targetFolderId: string | null) => void
  onShowInfo?: (id: string) => void
  onDelete?: (id: string) => void
}

const INDENT = 14

const iconColor: Record<SourceKind, string> = {
  pdf: 'text-rose-500',
  md: 'text-sky-500',
  txt: 'text-gray-500',
}

const statusDot: Record<string, string> = {
  processing: 'bg-amber-400 animate-pulse',
  pending: 'bg-amber-400 animate-pulse',
  error: 'bg-rose-500',
}

export default function SourceItem({
  source,
  depth,
  active,
  onSelect,
  onToggleSelect,
  onShowInfo,
  onDelete,
}: SourceItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/source-id', source.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const dotClass = source.status ? statusDot[source.status] : undefined

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(source.id)}
      className={`group flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition ${
        active
          ? 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-100'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      style={{ paddingLeft: depth * INDENT + 22 }}
      title={source.name}
    >
      <span className="relative flex shrink-0">
        <svg
          className={`h-3.5 w-3.5 ${iconColor[source.kind]}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        {dotClass && (
          <span
            className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ring-1 ring-white ${dotClass}`}
            title={source.status}
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{source.name}</span>

      {onShowInfo && (
        <button
          type="button"
          title="File info"
          onClick={(e) => {
            e.stopPropagation()
            onShowInfo(source.id)
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          title="Delete document"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(source.id)
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      )}

      {source.selected ? (
        <button
          type="button"
          title="Remove from context"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(source.id)
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
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
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition hover:bg-amber-100 hover:text-amber-600 group-hover:opacity-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  )
}
