import type { PdfSource, SourceFolder, SourceKind } from '../types'

interface ContextSectionProps {
  folders: SourceFolder[]
  sources: PdfSource[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemoveSource: (id: string) => void
  onRemoveFolder: (id: string) => void
}

const iconColor: Record<SourceKind, string> = {
  pdf: 'text-rose-500',
  md: 'text-sky-500',
  txt: 'text-gray-500',
}

export default function ContextSection({
  folders,
  sources,
  selectedId,
  onSelect,
  onRemoveSource,
  onRemoveFolder,
}: ContextSectionProps) {
  const total = folders.length + sources.length
  if (total === 0) return null

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          In context
        </span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
          {total}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5 px-1.5 pb-1.5">
        {folders.map((folder) => (
          <li key={folder.id}>
            <div
              className="group flex h-7 items-center gap-2 rounded-md px-1.5 text-sm text-indigo-900/80 transition hover:bg-white/70"
              title={folder.name}
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 text-amber-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
              </svg>
              <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
              <button
                type="button"
                title="Remove folder from context"
                onClick={() => onRemoveFolder(folder.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-indigo-400 transition hover:bg-rose-100 hover:text-rose-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </li>
        ))}
        {sources.map((source) => {
          const active = selectedId === source.id
          return (
            <li key={source.id}>
              <div
                onClick={() => onSelect(source.id)}
                className={`group flex h-7 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition ${
                  active
                    ? 'bg-white text-indigo-900 ring-1 ring-inset ring-indigo-200'
                    : 'text-indigo-900/80 hover:bg-white/70'
                }`}
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
                <button
                  type="button"
                  title="Remove from context"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveSource(source.id)
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-indigo-400 transition hover:bg-rose-100 hover:text-rose-600"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
