export interface PdfSource {
  id: string
  name: string
  pages: number
  selected: boolean
}

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
