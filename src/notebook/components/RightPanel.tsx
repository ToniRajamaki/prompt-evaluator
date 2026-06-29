import { useState } from 'react'
import type { ChunkSet, Citation } from '../types'
import ChatPanel from './ChatPanel'
import ChunksPanel from './ChunksPanel'

type Tab = 'chat' | 'chunks'

interface RightPanelProps {
  chunkSet: ChunkSet | null
  hoveredChunkId: string | null
  activeChunkId: string | null
  onHoverChunk: (id: string | null) => void
  onSelectChunk: (id: string | null) => void
  onCitationClick?: (citation: Citation) => void
  onSourceClick?: (fileName: string) => void
}

export default function RightPanel({
  chunkSet,
  hoveredChunkId,
  activeChunkId,
  onHoverChunk,
  onSelectChunk,
  onCitationClick,
  onSourceClick,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('chat')
  const showChunks = Boolean(chunkSet)
  const activeTab = showChunks ? tab : 'chat'

  const tabClass = (active: boolean) =>
    `relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
      active
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-800'
    }`

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 bg-gray-50/70 p-2">
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={tabClass(activeTab === 'chat')}
        >
          Chat
        </button>
        {showChunks && (
          <button
            type="button"
            onClick={() => setTab('chunks')}
            className={tabClass(activeTab === 'chunks')}
          >
            Chunks
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {chunkSet?.chunks.length}
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === 'chunks' && chunkSet ? (
          <ChunksPanel
            chunkSet={chunkSet}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onHover={onHoverChunk}
            onSelect={onSelectChunk}
          />
        ) : (
          <ChatPanel
            chunkSet={chunkSet}
            onCitationClick={onCitationClick}
            onSourceClick={onSourceClick}
          />
        )}
      </div>
    </div>
  )
}
