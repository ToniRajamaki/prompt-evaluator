import { useEffect, useRef, useState } from 'react'
import type { ChatContextAttachment, Chunk, SourceFile } from '../types'
import PdfViewer from './PdfViewer'
import TextViewer from './TextViewer'

interface FileViewerProps {
  file: SourceFile | null
  chunks?: Chunk[]
  hoveredChunkId?: string | null
  activeChunkId?: string | null
  onChunkClick?: (chunkId: string) => void
  onAddContext?: (attachment: ChatContextAttachment) => void
}

interface SelectionAction {
  text: string
  x: number
  y: number
}

const MIN_SELECTION_LENGTH = 2

function selectionRect(range: Range): DOMRect | null {
  const rect = range.getBoundingClientRect()
  if (rect.width || rect.height) return rect
  return Array.from(range.getClientRects()).find((r) => r.width || r.height) ?? null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function FileViewer({
  file,
  chunks,
  hoveredChunkId,
  activeChunkId,
  onChunkClick,
  onAddContext,
}: FileViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null)

  const clearSelectionAction = () => setSelectionAction(null)

  const updateSelectionAction = (event?: React.MouseEvent<HTMLDivElement>) => {
    const container = viewerRef.current
    if (!container || !file) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      clearSelectionAction()
      return
    }

    const anchor = selection.anchorNode
    const focus = selection.focusNode
    if (!anchor || !focus || !container.contains(anchor) || !container.contains(focus)) {
      clearSelectionAction()
      return
    }

    const text = selection.toString().replace(/\s+/g, ' ').trim()
    if (text.length < MIN_SELECTION_LENGTH) {
      clearSelectionAction()
      return
    }

    const rect = selectionRect(selection.getRangeAt(0))
    if (!rect) {
      clearSelectionAction()
      return
    }

    const host = container.getBoundingClientRect()
    const x = event ? event.clientX - host.left + 14 : rect.right - host.left + 12
    const y = event ? event.clientY - host.top + 14 : rect.bottom - host.top + 12

    setSelectionAction({
      text,
      x: clamp(x, 12, host.width - 140),
      y: clamp(y, 12, host.height - 44),
    })
  }

  useEffect(() => {
    clearSelectionAction()
  }, [file?.id])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelectionAction()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const addSelectionToChat = () => {
    if (!selectionAction || !file) return
    onAddContext?.({
      id: crypto.randomUUID(),
      text: selectionAction.text,
      sourceId: file.id,
      sourceName: file.name,
      sourceKind: file.kind,
      label: file.name,
      createdFrom: 'selection',
    })
    window.getSelection()?.removeAllRanges()
    clearSelectionAction()
  }

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        Select a file from the sidebar to preview it
      </div>
    )
  }

  const badgeColor: Record<string, string> = {
    pdf: 'bg-rose-50 text-rose-600 ring-rose-100',
    md: 'bg-sky-50 text-sky-600 ring-sky-100',
    txt: 'bg-gray-100 text-gray-500 ring-gray-200',
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-1.5 pr-3 text-sm font-medium text-gray-700 shadow-sm">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${
              badgeColor[file.kind] ?? badgeColor.txt
            }`}
          >
            {file.kind}
          </span>
          {file.name}
        </span>
      </div>
      <div
        ref={viewerRef}
        onMouseUp={(event) => updateSelectionAction(event)}
        onKeyUp={() => updateSelectionAction()}
        onScrollCapture={clearSelectionAction}
        className="relative flex-1 overflow-hidden bg-gray-50/40"
      >
        {file.kind === 'pdf' ? (
          <PdfViewer
            url={file.url}
            chunks={chunks}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onChunkClick={onChunkClick}
          />
        ) : (
          <TextViewer
            url={file.url}
            mode={file.kind}
            chunks={chunks}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onChunkClick={onChunkClick}
          />
        )}
        {selectionAction && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={addSelectionToChat}
            className="absolute z-30 flex items-center gap-1.5 rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-lg shadow-gray-900/10 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            style={{ left: selectionAction.x, top: selectionAction.y }}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add to chat
          </button>
        )}
      </div>
    </div>
  )
}
