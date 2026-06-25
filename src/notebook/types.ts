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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface ChatHistoryItem {
  id: string
  title: string
  updatedAt: string
}
