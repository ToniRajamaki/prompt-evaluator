import { useState } from 'react'
import SourcesTab from './SourcesTab'
import ChatHistoryTab from './ChatHistoryTab'

type Tab = 'sources' | 'history'

interface SidebarProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function Sidebar({ selectedId, onSelect }: SidebarProps) {
  const [tab, setTab] = useState<Tab>('sources')

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
      active
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-800'
    }`

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50/70 p-2">
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'sources' ? (
          <SourcesTab selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <ChatHistoryTab />
        )}
      </div>
    </aside>
  )
}
