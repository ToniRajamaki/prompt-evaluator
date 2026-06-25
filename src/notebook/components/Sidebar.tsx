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
    `flex-1 px-3 py-2 text-sm font-medium border-b-2 ${
      active
        ? 'border-gray-800 text-gray-900'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <aside className="flex w-72 flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex border-b border-gray-200">
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
