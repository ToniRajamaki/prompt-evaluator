import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import FileViewer from './components/FileViewer'
import { sourceFiles } from './fileRegistry'
import { getChunksForFile } from './data/chunksRegistry'
import type { Citation } from './types'

type ResizeSide = 'left' | 'right'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function ResizeHandle({
  label,
  onPointerDown,
}: {
  label: string
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className="group flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch rounded-full"
    >
      <div className="h-12 w-1 rounded-full bg-transparent transition group-hover:bg-indigo-200 group-active:bg-indigo-300" />
    </div>
  )
}

export default function NotebookApp() {
  const [selectedId, setSelectedId] = useState<string | null>(
    sourceFiles[0]?.id ?? null,
  )
  const [leftWidth, setLeftWidth] = useState(288)
  const [rightWidth, setRightWidth] = useState(384)
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)
  const pendingChunkId = useRef<string | null>(null)

  const selected = sourceFiles.find((f) => f.id === selectedId) ?? null
  const chunkSet = useMemo(
    () => (selected?.kind === 'pdf' ? getChunksForFile(selected.name) : null),
    [selected],
  )

  // Reset chunk selection when switching files, but honor a pending citation jump.
  useEffect(() => {
    setHoveredChunkId(null)
    if (pendingChunkId.current) {
      setActiveChunkId(pendingChunkId.current)
      pendingChunkId.current = null
    } else {
      setActiveChunkId(null)
    }
  }, [selectedId])

  const focusCitation = (citation: Citation) => {
    const target = sourceFiles.find((f) => f.name === citation.fileName)
    if (!target) return
    if (target.id === selectedId) {
      setActiveChunkId(citation.chunkId)
    } else {
      pendingChunkId.current = citation.chunkId
      setSelectedId(target.id)
    }
  }

  const focusSource = (fileName: string) => {
    const target = sourceFiles.find((f) => f.name === fileName)
    if (!target) return
    pendingChunkId.current = null
    setActiveChunkId(null)
    setSelectedId(target.id)
  }

  const beginResize = (
    side: ResizeSide,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = side === 'left' ? leftWidth : rightWidth

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - startX
      const nextWidth = side === 'left' ? startWidth + delta : startWidth - delta
      const setWidth = side === 'left' ? setLeftWidth : setRightWidth
      setWidth(clamp(nextWidth, side === 'left' ? 220 : 320, side === 'left' ? 460 : 620))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

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

      <div className="flex flex-1 overflow-hidden p-3">
        <aside
          className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{ width: leftWidth }}
        >
          <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
        </aside>
        <ResizeHandle
          label="Resize sources panel"
          onPointerDown={(e) => beginResize('left', e)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
        <ResizeHandle
          label="Resize chat panel"
          onPointerDown={(e) => beginResize('right', e)}
        />
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{ width: rightWidth }}
        >
          <RightPanel
            chunkSet={chunkSet}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onHoverChunk={setHoveredChunkId}
            onSelectChunk={setActiveChunkId}
            onCitationClick={focusCitation}
            onSourceClick={focusSource}
          />
        </div>
      </div>
    </div>
  )
}
