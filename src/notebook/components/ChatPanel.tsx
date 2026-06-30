import { useEffect, useRef, useState } from 'react'
import type {
  AnswerParagraph,
  ChatMessage as ChatMessageType,
  ChunkSet,
  Citation,
} from '../types'
import { sendChatStream, toCitation, type BackendCitation } from '../api/chat'
import { useStreamingText } from '../hooks/useStreamingText'
import ChatMessage from './ChatMessage'
import TypingDots from './TypingDots'

interface ChatPanelProps {
  chunkSet: ChunkSet | null
  documentId?: string | null
  onCitationClick?: (citation: Citation) => void
  onSourceClick?: (fileName: string) => void
}

/** Remove inline chunk-id citation tokens (e.g. "[claude-stuff-c01]") from text. */
function stripCitationTokens(text: string): string {
  return text.replace(/\s*\[[^\]\n]*-c\d+[^\]\n]*\]/gi, '').trim()
}

function buildParagraphs(
  text: string,
  citations: BackendCitation[],
): AnswerParagraph[] {
  return [
    {
      id: crypto.randomUUID(),
      text: stripCitationTokens(text),
      citations: citations.map(toCitation),
    },
  ]
}

export default function ChatPanel({
  chunkSet,
  documentId,
  onCitationClick,
  onSourceClick,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingActive, setStreamingActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { displayed, push, reset } = useStreamingText()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  const maybeScroll = () => {
    if (!pinnedRef.current) return
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  useEffect(() => {
    maybeScroll()
  }, [messages, loading, displayed])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    }
    const history = [...messages, userMessage]

    setMessages(history)
    setInput('')
    setError(null)
    setLoading(true)
    pinnedRef.current = true
    maybeScroll()

    reset()
    let full = ''
    try {
      const citations = await sendChatStream(
        history,
        (delta) => {
          full += delta
          push(delta)
          if (!streamingActive) setStreamingActive(true)
        },
        { documentId },
      )
      setMessages((curr) => [
        ...curr,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: stripCitationTokens(full),
          paragraphs: buildParagraphs(full, citations),
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
      setStreamingActive(false)
      reset()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const showTyping = loading && !streamingActive

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && !loading && (
          <p className="mt-8 text-center text-sm text-gray-400">
            Ask something to get started.
          </p>
        )}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onCitationClick={onCitationClick}
            onSourceClick={onSourceClick}
          />
        ))}
        {streamingActive && (
          <ChatMessage
            message={{ id: 'streaming', role: 'assistant', text: displayed }}
            streaming
          />
        )}
        {showTyping && (
          <div className="flex justify-start">
            <div className="rounded border border-gray-200 bg-white px-3 py-2">
              <TypingDots />
            </div>
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask anything about your sources…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        {chunkSet && (
          <p className="mt-1.5 px-1 text-[11px] text-gray-400">
            Answers are grounded in {documentId ? 'this document' : 'your documents'} via retrieval.
          </p>
        )}
      </div>
    </main>
  )
}
