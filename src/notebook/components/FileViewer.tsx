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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
        {file.name}
      </div>
      <div className="flex-1 overflow-hidden">
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
