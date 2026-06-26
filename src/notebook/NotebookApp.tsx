import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import FileViewer from './components/FileViewer'
import { sourceFiles } from './fileRegistry'
import { getChunksForFile } from './data/chunksRegistry'

export default function NotebookApp() {
  const [selectedId, setSelectedId] = useState<string | null>(
    sourceFiles[0]?.id ?? null,
  )
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)

  const selected = sourceFiles.find((f) => f.id === selectedId) ?? null
  const chunkSet = useMemo(
    () => (selected?.kind === 'pdf' ? getChunksForFile(selected.name) : null),
    [selected],
  )

  // Reset chunk selection when switching files
  useEffect(() => {
    setHoveredChunkId(null)
    setActiveChunkId(null)
  }, [selectedId])

  return (
    <div className="flex h-screen flex-col bg-[#f7f7f8] text-gray-900">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white/80 px-5 py-3 backdrop-blur">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div className="flex flex-col leading-tight">
          <h1 className="text-sm font-semibold text-gray-900">SourceChat</h1>
          <span className="text-xs text-gray-400">Chat with your documents</span>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <aside className="flex w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <FileViewer
            file={selected}
            chunks={chunkSet?.chunks}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onChunkClick={(id) =>
              setActiveChunkId((curr) => (curr === id ? null : id))
            }
          />
        </div>
        <div className="flex w-96 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <RightPanel
            chunkSet={chunkSet}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onHoverChunk={setHoveredChunkId}
            onSelectChunk={setActiveChunkId}
          />
        </div>
      </div>
    </div>
  )
}
