export type SourceKind = 'pdf' | 'md' | 'txt'

export interface SourceFile {
  id: string
  name: string
  url: string
  kind: SourceKind
}

export interface PdfSource {
  id: string
  name: string
  pages?: number
  selected: boolean
  parentId: string | null
  kind: SourceKind
  url: string
}

export interface SourceFolder {
  id: string
  name: string
  parentId: string | null
}

export type SourceNode =
  | { kind: 'folder'; folder: SourceFolder; children: SourceNode[] }
  | { kind: 'file'; source: PdfSource }

export interface Citation {
  id: string
  fileName: string
  page: number
  chunkId: string
  snippet: string
}

export interface AnswerParagraph {
  id: string
  text: string
  citations: Citation[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Structured, source-cited answer. Present only on assistant messages. */
  paragraphs?: AnswerParagraph[]
}

export interface ChatHistoryItem {
  id: string
  title: string
  updatedAt: string
}

export interface Chunk {
  id: string
  index: number
  start: number
  end: number
  length: number
  text: string
  page?: number
  manualHighlights?: ManualChunkHighlight[]
}

export interface ChunkSet {
  source: string
  page: number
  method: string
  params: Record<string, unknown>
  chunks: Chunk[]
  fullText: string
}

export interface HighlightRect {
  left: number
  top: number
  width: number
  height: number
}

export interface NormalizedHighlightRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ManualChunkHighlight {
  pageNumber: number
  rects: NormalizedHighlightRect[]
}

export interface ChunkPageHighlights {
  chunkId: string
  pageNumber: number
  rects: HighlightRect[]
}
