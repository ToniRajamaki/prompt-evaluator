import type { PdfSource, ChatMessage, ChatHistoryItem } from './types'

export const pdfSources: PdfSource[] = [
  { id: 's1', name: 'annual-report-2024.pdf', pages: 42, selected: true },
  { id: 's2', name: 'product-spec.pdf', pages: 12, selected: true },
  { id: 's3', name: 'meeting-notes.pdf', pages: 3, selected: false },
  { id: 's4', name: 'research-paper.pdf', pages: 28, selected: false },
]

export const chatMessages: ChatMessage[] = [
  { id: 'm1', role: 'user', text: 'What were the main takeaways from the annual report?' },
  {
    id: 'm2',
    role: 'assistant',
    text: 'Based on annual-report-2024.pdf, revenue grew 18% year over year, driven mostly by the new subscription tier. Operating costs stayed flat.',
  },
  { id: 'm3', role: 'user', text: 'Does that line up with the product spec?' },
  {
    id: 'm4',
    role: 'assistant',
    text: 'Yes — product-spec.pdf describes the subscription tier launched in Q1, which matches the revenue bump in the report.',
  },
]

export const chatHistory: ChatHistoryItem[] = [
  { id: 'c1', title: 'Annual report summary', updatedAt: '2h ago' },
  { id: 'c2', title: 'Product spec questions', updatedAt: 'Yesterday' },
  { id: 'c3', title: 'Research paper deep-dive', updatedAt: '3 days ago' },
]
