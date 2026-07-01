import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import FileViewer from './components/FileViewer'
import FileInfoPanel from './components/FileInfoPanel'
import { getChunksForFile } from './data/chunksRegistry'
import { chunkText } from './chunker'
import { getDocumentChunks } from './api/documents'
import { useDocuments, type DocumentEntry } from './hooks/useDocuments'
import type {
  ChatContextAttachment,
  Citation,
  ChunkSet,
  PdfSource,
  SourceFile,
} from './types'

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

function entryToFile(entry: DocumentEntry): SourceFile {
  return { id: entry.id, name: entry.name, url: entry.url, kind: entry.kind }
}

function entryToSource(entry: DocumentEntry, prev?: PdfSource): PdfSource {
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    url: entry.url,
    status: entry.status,
    selected: prev?.selected ?? false,
    parentId: prev?.parentId ?? null,
  }
}

export default function NotebookApp() {
  const { entries, backendUp, upload, remove } = useDocuments()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [leftWidth, setLeftWidth] = useState(288)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightWidth, setRightWidth] = useState(384)
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)
  const [infoId, setInfoId] = useState<string | null>(null)
  const [chatContexts, setChatContexts] = useState<ChatContextAttachment[]>([])
  const pendingChunkId = useRef<string | null>(null)

  // Source list with local-only UI state (context selection + folder placement),
  // kept in sync with backend documents. Lifted here so the chat panel can scope
  // retrieval to the documents the user checked into context.
  const [sources, setSources] = useState<PdfSource[]>([])
  useEffect(() => {
    setSources((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]))
      return entries.map((e) => entryToSource(e, byId.get(e.id)))
    })
  }, [entries])

  const contextDocumentIds = useMemo(
    () => sources.filter((s) => s.selected).map((s) => s.id),
    [sources],
  )

  // Default the selection to the first document once they load.
  useEffect(() => {
    if (selectedId === null && entries.length > 0) {
      setSelectedId(entries[0].id)
    }
  }, [entries, selectedId])

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )
  const selectedFile = selectedEntry ? entryToFile(selectedEntry) : null
  const infoEntry = useMemo(
    () => entries.find((e) => e.id === infoId) ?? null,
    [entries, infoId],
  )

  // Chunks: backend documents fetch their ChunkSet from the API; static demo
  // files use prebuilt PDF JSON or runtime md/txt chunking.
  const [chunkSet, setChunkSet] = useState<ChunkSet | null>(null)

  useEffect(() => {
    let cancelled = false
    setChunkSet(null)
    if (!selectedEntry) return

    if (selectedEntry.backed === 'backend') {
      if (selectedEntry.status !== 'ready') return
      getDocumentChunks(selectedEntry.id)
        .then((set) => {
          if (!cancelled) setChunkSet(set)
        })
        .catch(() => {
          if (!cancelled) setChunkSet(null)
        })
      return () => {
        cancelled = true
      }
    }

    // Static demo file paths.
    if (selectedEntry.kind === 'pdf') {
      setChunkSet(getChunksForFile(selectedEntry.name))
      return
    }
    fetch(selectedEntry.url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (!cancelled) setChunkSet(chunkText(selectedEntry.name, text))
      })
      .catch(() => {
        if (!cancelled) setChunkSet(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEntry])

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
    const target = entries.find((f) => f.name === citation.fileName)
    if (!target) return
    if (target.id === selectedId) {
      setActiveChunkId(citation.chunkId)
    } else {
      pendingChunkId.current = citation.chunkId
      setSelectedId(target.id)
    }
  }

  const focusSource = (fileName: string) => {
    const target = entries.find((f) => f.name === fileName)
    if (!target) return
    pendingChunkId.current = null
    setActiveChunkId(null)
    setSelectedId(target.id)
  }

  const handleDelete = (id: string) => {
    void remove(id).then(() => {
      if (selectedId === id) setSelectedId(null)
      if (infoId === id) setInfoId(null)
    })
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
        <img
          src="/highlight-studio-logo.png"
          alt="Highlight Studio"
          className="h-8 w-auto"
        />
        {!backendUp && (
          <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            Backend offline — showing demo files
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden p-3">
        <aside
          className={`flex shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-[width] duration-150 ${
            leftCollapsed ? 'overflow-visible' : 'overflow-hidden'
          }`}
          style={{ width: leftCollapsed ? 56 : leftWidth }}
        >
          <Sidebar
            selectedId={selectedId}
            onSelect={setSelectedId}
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed((v) => !v)}
            sources={sources}
            setSources={setSources}
            backendUp={backendUp}
            onUpload={(file) => {
              void upload(file)
            }}
            onDelete={handleDelete}
            onShowInfo={setInfoId}
          />
        </aside>
        {leftCollapsed ? (
          <div className="w-2 shrink-0" />
        ) : (
          <ResizeHandle
            label="Resize sources panel"
            onPointerDown={(e) => beginResize('left', e)}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <FileViewer
            file={selectedFile}
            chunks={chunkSet?.chunks}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onChunkClick={(id) =>
              setActiveChunkId((curr) => (curr === id ? null : id))
            }
            onAddContext={(attachment) =>
              setChatContexts((current) => [...current, attachment])
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
            documentId={selectedEntry?.backed === 'backend' ? selectedEntry.id : null}
            contextDocumentIds={contextDocumentIds}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            chatContexts={chatContexts}
            onChatContextsChange={setChatContexts}
            onHoverChunk={setHoveredChunkId}
            onSelectChunk={setActiveChunkId}
            onCitationClick={focusCitation}
            onSourceClick={focusSource}
          />
        </div>
      </div>

      {infoEntry && (
        <FileInfoPanel entry={infoEntry} onClose={() => setInfoId(null)} />
      )}
    </div>
  )
}
