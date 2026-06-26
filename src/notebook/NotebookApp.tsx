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
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">PDF Notebook</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
        <div className="flex-1 overflow-hidden border-r border-gray-200">
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
        <div className="flex w-96 flex-col">
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
