export type SourceKind = 'pdf' | 'md' | 'txt'

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error'

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
  status?: DocumentStatus
}

export interface SourceFolder {
  id: string
  name: string
  parentId: string | null
  selected?: boolean
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
  /** Raw markdown answer. Present when display text has been normalized. */
  markdown?: string
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
  /**
   * Precomputed highlight boxes per page, in normalized page coordinates
   * (0..1). Produced offline by a PDF parser (PyMuPDF) so the runtime can scale
   * them to any zoom without re-parsing. When absent, highlights are derived
   * live by matching `text` against the PDF/text-document content.
   */
  highlights?: ChunkHighlight[]
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

/**
 * A highlight box in normalized page coordinates (each value in 0..1, relative
 * to the page width/height). `x0,y0` is the top-left corner, `x1,y1` the
 * bottom-right. Matches the box schema stored by the PDF-parsing pipeline.
 */
export interface NormalizedBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface ChunkHighlight {
  page: number
  boxes: NormalizedBox[]
}

export interface ChunkPageHighlights {
  chunkId: string
  pageNumber: number
  rects: HighlightRect[]
}
