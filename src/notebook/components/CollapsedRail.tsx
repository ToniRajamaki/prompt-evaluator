import { useRef } from 'react'
import type { PdfSource, SourceFolder, SourceKind } from '../types'

interface CollapsedRailProps {
  folders: SourceFolder[]
  sources: PdfSource[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onToggleFolderSelect: (id: string) => void
  onUpload?: (file: File) => void | Promise<void>
  uploadDisabled?: boolean
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
            ? 'bg-amber-50 ring-1 ring-inset ring-amber-200'
            : source.selected
              ? 'bg-white ring-1 ring-inset ring-amber-200'
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

function RailFolder({
  folder,
  onToggleFolderSelect,
}: {
  folder: SourceFolder
  onToggleFolderSelect: (id: string) => void
}) {
  return (
    <li className="group relative">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-amber-200">
        <svg
          className="h-4 w-4 text-amber-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
        </svg>
      </div>

      <button
        type="button"
        title="Remove folder from context"
        onClick={() => onToggleFolderSelect(folder.id)}
        className="absolute -right-0.5 -top-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-400 text-white shadow group-hover:flex"
      >
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>

      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
        {folder.name}
      </span>
    </li>
  )
}

export default function CollapsedRail({
  folders,
  sources,
  selectedId,
  onSelect,
  onToggleSelect,
  onToggleFolderSelect,
  onUpload,
  uploadDisabled,
}: CollapsedRailProps) {
  const contextFolders = folders.filter((folder) => folder.selected)
  const contextSources = sources.filter((s) => s.selected)
  const otherSources = sources.filter((s) => !s.selected)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-1 flex-col overflow-visible">
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

      {contextFolders.length + contextSources.length > 0 && (
        <div className="mx-auto mb-2 flex w-9 flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2">
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-semibold text-white">
            {contextFolders.length + contextSources.length}
          </span>
          {contextFolders.map((folder) => (
            <RailFolder
              key={folder.id}
              folder={folder}
              onToggleFolderSelect={onToggleFolderSelect}
            />
          ))}
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
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.txt"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files && onUpload) {
              Array.from(files).forEach((f) => void onUpload(f))
            }
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
        <button
          type="button"
          title="Upload source"
          disabled={uploadDisabled}
          onClick={() => inputRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 text-gray-500 transition hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-600 disabled:opacity-50"
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
