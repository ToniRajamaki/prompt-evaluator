import { useEffect, useRef, useState } from 'react'
import type { ChatMessage as ChatMessageType } from '../types'
import { sendChatStream } from '../api/chat'
import { useStreamingText } from '../hooks/useStreamingText'
import ChatMessage from './ChatMessage'
import TypingDots from './TypingDots'

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [networkDone, setNetworkDone] = useState(false)

  const stream = useStreamingText()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const fullRef = useRef('')

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

  // Keep pinned to the bottom while content grows (unless the user scrolled up).
  useEffect(() => {
    maybeScroll()
  }, [stream.displayed, messages, loading])

  // Finalize once the network is done and the typewriter has caught up.
  useEffect(() => {
    if (streamingId && networkDone && stream.caughtUp) {
      const id = streamingId
      const text = fullRef.current
      setMessages((curr) => curr.map((m) => (m.id === id ? { ...m, text } : m)))
      setStreamingId(null)
      setNetworkDone(false)
      setLoading(false)
    }
  }, [streamingId, networkDone, stream.caughtUp])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    }
    const assistantId = crypto.randomUUID()
    const next = [...messages, userMessage]

    setMessages([...next, { id: assistantId, role: 'assistant', text: '' }])
    setInput('')
    setError(null)
    setLoading(true)
    setStreamingId(assistantId)
    setNetworkDone(false)
    fullRef.current = ''
    stream.reset()
    pinnedRef.current = true
    maybeScroll()

    try {
      await sendChatStream(next, (delta) => {
        fullRef.current += delta
        stream.push(delta)
      })
      setNetworkDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      const partial = fullRef.current
      setMessages((curr) =>
        partial
          ? curr.map((m) => (m.id === assistantId ? { ...m, text: partial } : m))
          : curr.filter((m) => m.id !== assistantId),
      )
      setStreamingId(null)
      setNetworkDone(false)
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !loading && (
          <p className="mt-8 text-center text-sm text-gray-400">
            Ask something to get started.
          </p>
        )}
        {messages.map((message) => {
          const isStreaming = message.id === streamingId
          if (isStreaming && stream.displayed.length === 0) {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="rounded border border-gray-200 bg-white px-3 py-2">
                  <TypingDots />
                </div>
              </div>
            )
          }
          return (
            <ChatMessage
              key={message.id}
              message={isStreaming ? { ...message, text: stream.displayed } : message}
              streaming={isStreaming}
            />
          )
        })}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask something about your PDFs…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}
