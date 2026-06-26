import { useState } from 'react'
import type { ChunkSet } from '../types'
import ChatPanel from './ChatPanel'
import ChunksPanel from './ChunksPanel'

type Tab = 'chat' | 'chunks'

interface RightPanelProps {
  chunkSet: ChunkSet | null
  hoveredChunkId: string | null
  activeChunkId: string | null
  onHoverChunk: (id: string | null) => void
  onSelectChunk: (id: string | null) => void
}

export default function RightPanel({
  chunkSet,
  hoveredChunkId,
  activeChunkId,
  onHoverChunk,
  onSelectChunk,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>(chunkSet ? 'chunks' : 'chat')
  const showChunks = Boolean(chunkSet)
  const activeTab = showChunks ? tab : 'chat'

  const tabClass = (active: boolean) =>
    `relative flex-1 px-3 py-2 text-sm font-medium border-b-2 ${
      active
        ? 'border-gray-800 text-gray-900'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-gray-200 bg-white">
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
            <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
              {chunkSet?.chunks.length}
            </span>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chunks' && chunkSet ? (
          <ChunksPanel
            chunkSet={chunkSet}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onHover={onHoverChunk}
            onSelect={onSelectChunk}
          />
        ) : (
          <ChatPanel />
        )}
      </div>
    </div>
  )
}
