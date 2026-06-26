import type { Chunk, SourceFile } from '../types'
import PdfViewer from './PdfViewer'
import TextViewer from './TextViewer'

interface FileViewerProps {
  file: SourceFile | null
  chunks?: Chunk[]
  hoveredChunkId?: string | null
  activeChunkId?: string | null
  onChunkClick?: (chunkId: string) => void
}

export default function FileViewer({
  file,
  chunks,
  hoveredChunkId,
  activeChunkId,
  onChunkClick,
}: FileViewerProps) {
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
      <div className="flex-1 overflow-hidden bg-gray-50/40">
        {file.kind === 'pdf' ? (
          <PdfViewer
            url={file.url}
            chunks={chunks}
            hoveredChunkId={hoveredChunkId}
            activeChunkId={activeChunkId}
            onChunkClick={onChunkClick}
          />
        ) : (
          <TextViewer url={file.url} mode={file.kind} />
        )}
      </div>
    </div>
  )
}
