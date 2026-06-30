import type { ChatMessage, Citation } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Record separator used by the backend to delimit the citations trailer. */
const RECORD_SEP = '\x1e'

export interface BackendCitation {
  id: string
  chunkId: string
  fileName: string
  page: number
  snippet: string
  score: number
}

function toMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, text: m.text }))
}

export function toCitation(c: BackendCitation): Citation {
  return {
    id: c.id,
    fileName: c.fileName,
    page: c.page,
    chunkId: c.chunkId,
    snippet: c.snippet,
  }
}

export interface ChatResult {
  reply: string
  citations: BackendCitation[]
}

export async function sendChat(
  messages: ChatMessage[],
  documentId?: string | null,
): Promise<ChatResult> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: toMessages(messages), documentId }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `Request failed (${res.status})`)
  }

  const data = (await res.json()) as ChatResult
  return { reply: data.reply, citations: data.citations ?? [] }
}

/**
 * Stream the assistant reply. Text deltas are delivered via `onDelta`; the
 * trailing citations record (after the \x1e separator) is parsed and returned.
 */
export async function sendChatStream(
  messages: ChatMessage[],
  onDelta: (chunk: string) => void,
  options: { documentId?: string | null; signal?: AbortSignal } = {},
): Promise<BackendCitation[]> {
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: toMessages(messages),
      documentId: options.documentId,
    }),
    signal: options.signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let trailer = ''
  let sawSeparator = false

  const handle = (text: string) => {
    if (sawSeparator) {
      trailer += text
      return
    }
    const sepIndex = text.indexOf(RECORD_SEP)
    if (sepIndex === -1) {
      onDelta(text)
    } else {
      const before = text.slice(0, sepIndex)
      if (before) onDelta(before)
      trailer += text.slice(sepIndex + 1)
      sawSeparator = true
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) handle(chunk)
  }
  const tail = decoder.decode()
  if (tail) handle(tail)

  if (!trailer.trim()) return []
  try {
    const parsed = JSON.parse(trailer) as { citations?: BackendCitation[] }
    return parsed.citations ?? []
  } catch {
    return []
  }
}
