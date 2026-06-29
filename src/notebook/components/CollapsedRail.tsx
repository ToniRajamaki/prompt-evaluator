import type { PdfSource, SourceKind } from '../types'

interface CollapsedRailProps {
  sources: PdfSource[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
}

const iconColor: Record<SourceKind, string> = {
  pdf: 'text-rose-500',
  md: 'text-sky-500',
  txt: 'text-gray-500',
}

const addColor: Record<SourceKind, string> = {
  pdf: 'bg-rose-500',
  md: 'bg-sky-500',
  txt: 'bg-gray-500',
}

function RailItem({
  source,
  active,
  onSelect,
  onToggleSelect,
}: {
  source: PdfSource
  active: boolean
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onSelect(source.id)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
          active
            ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200'
            : source.selected
              ? 'bg-white ring-1 ring-inset ring-indigo-200'
              : 'hover:bg-gray-100'
        }`}
      >
        <svg
          className={`h-4 w-4 ${iconColor[source.kind]}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      </button>

      <button
        type="button"
        title={source.selected ? 'Remove from context' : 'Add to context'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect(source.id)
        }}
        className={`absolute -right-0.5 -top-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full text-white shadow group-hover:flex ${
          source.selected ? 'bg-gray-400' : addColor[source.kind]
        }`}
      >
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          {source.selected ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
      </button>

      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
        {source.name}
      </span>
    </li>
  )
}

export default function CollapsedRail({
  sources,
  selectedId,
  onSelect,
  onToggleSelect,
}: CollapsedRailProps) {
  const contextSources = sources.filter((s) => s.selected)
  const otherSources = sources.filter((s) => !s.selected)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto overflow-x-visible">
      <ul className="flex flex-col items-center gap-1 py-3">
        {otherSources.map((source) => (
          <RailItem
            key={source.id}
            source={source}
            active={selectedId === source.id}
            onSelect={onSelect}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </ul>

      {contextSources.length > 0 && (
        <div className="mx-auto mb-2 flex w-9 flex-col items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/60 py-2">
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
            {contextSources.length}
          </span>
          {contextSources.map((source) => (
            <RailItem
              key={source.id}
              source={source}
              active={selectedId === source.id}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex justify-center border-t border-gray-100 p-2">
        <button
          type="button"
          title="Upload source"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 text-gray-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M5 11l7-7 7 7" />
            <path d="M5 20h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
