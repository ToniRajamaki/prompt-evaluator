import { useState } from 'react'
import SourcesTab from './SourcesTab'
import ChatHistoryTab from './ChatHistoryTab'
import CollapsedRail from './CollapsedRail'
import { pdfSources as initialSources, sourceFolders as initialFolders } from '../mockData'
import type { PdfSource, SourceFolder } from '../types'

type Tab = 'sources' | 'history'

interface SidebarProps {
  selectedId: string | null
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [tab, setTab] = useState<Tab>('sources')
  const [folders, setFolders] = useState<SourceFolder[]>(initialFolders)
  const [sources, setSources] = useState<PdfSource[]>(initialSources)

  const toggleSelect = (id: string) =>
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    )

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
      active
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-800'
    }`

  if (collapsed) {
    return (
      <aside className="flex h-full w-full flex-col">
        <div className="flex items-center justify-center border-b border-gray-200 bg-gray-50/70 p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand panel"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-gray-900 hover:shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <CollapsedRail
          sources={sources}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleSelect={toggleSelect}
        />
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50/70 p-2">
        <button
          type="button"
          onClick={() => setTab('sources')}
          className={tabClass(tab === 'sources')}
        >
          Sources
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={tabClass(tab === 'history')}
        >
          Chat history
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-gray-900 hover:shadow-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'sources' ? (
          <SourcesTab
            selectedId={selectedId}
            onSelect={onSelect}
            folders={folders}
            setFolders={setFolders}
            sources={sources}
            setSources={setSources}
          />
        ) : (
          <ChatHistoryTab />
        )}
      </div>
    </aside>
  )
}
