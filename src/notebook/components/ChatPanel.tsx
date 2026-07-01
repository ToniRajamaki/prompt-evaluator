import { useEffect, useRef, useState } from 'react'
import type {
  AnswerParagraph,
  ChatContextAttachment,
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
  contextDocumentIds?: string[]
  contextAttachments: ChatContextAttachment[]
  onContextAttachmentsChange: (attachments: ChatContextAttachment[]) => void
  onCitationClick?: (citation: Citation) => void
  onSourceClick?: (fileName: string) => void
}

/** Remove inline chunk-id citation tokens (e.g. "[claude-stuff-c01]") from text. */
function stripCitationTokens(text: string): string {
  return text.replace(/\s*\[[^\]\n]*-c\d+[^\]\n]*\]/gi, '').trim()
}

/** Matches a bracketed citation token; the inner group may list several ids. */
const CITATION_TOKEN_RE = /\[([^\]\n]+?)\]/g

/** Citations actually referenced (by inline token) within a block of text. */
function citedIn(block: string, byId: Map<string, Citation>): Citation[] {
  const used: Citation[] = []
  const seen = new Set<string>()
  CITATION_TOKEN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CITATION_TOKEN_RE.exec(block))) {
    for (const raw of match[1].split(/[,;]/)) {
      const citation = byId.get(raw.trim().toLowerCase())
      if (citation && !seen.has(citation.chunkId)) {
        used.push(citation)
        seen.add(citation.chunkId)
      }
    }
  }
  return used
}

function contextPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 90 ? `${normalized.slice(0, 90)}…` : normalized
}

function displayLabel(attachment: ChatContextAttachment): string {
  return attachment.label.replace(/\.(pdf|md|txt)$/i, '')
}

function sourceBadge(attachment: ChatContextAttachment): string {
  if (attachment.sourceKind) return attachment.sourceKind.toUpperCase()
  return attachment.createdFrom === 'paste' ? 'PASTE' : 'TEXT'
}

function contextTone(attachment: ChatContextAttachment) {
  if (attachment.sourceKind === 'pdf') {
    return {
      shell: 'border-rose-100 bg-rose-50/70',
      icon: 'text-rose-600 ring-rose-100',
      badge: 'text-rose-600 ring-rose-100',
      expanded: 'border-rose-100',
      focus: 'focus-visible:ring-rose-200',
    }
  }
  if (attachment.sourceKind === 'md') {
    return {
      shell: 'border-sky-100 bg-sky-50/70',
      icon: 'text-sky-600 ring-sky-100',
      badge: 'text-sky-600 ring-sky-100',
      expanded: 'border-sky-100',
      focus: 'focus-visible:ring-sky-200',
    }
  }
  if (attachment.sourceKind === 'txt') {
    return {
      shell: 'border-gray-200 bg-gray-50/80',
      icon: 'text-gray-500 ring-gray-200',
      badge: 'text-gray-500 ring-gray-200',
      expanded: 'border-gray-200',
      focus: 'focus-visible:ring-gray-200',
    }
  }
  return {
    shell: 'border-violet-100 bg-violet-50/70',
    icon: 'text-violet-600 ring-violet-100',
    badge: 'text-violet-600 ring-violet-100',
    expanded: 'border-violet-100',
    focus: 'focus-visible:ring-violet-200',
  }
}

function ContextAttachmentPill({
  attachment,
  expanded,
  onToggle,
  onRemove,
}: {
  attachment: ChatContextAttachment
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const tone = contextTone(attachment)

  return (
    <div
      className={`rounded-xl border text-xs text-gray-700 shadow-sm ${tone.shell}`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus-visible:ring-2 ${tone.focus}`}
          aria-expanded={expanded}
        >
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ${tone.icon}`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7h16" />
              <path d="M4 12h10" />
              <path d="M4 17h7" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-gray-800">
                {displayLabel(attachment)}
              </span>
              <span
                className={`shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${tone.badge}`}
              >
                {sourceBadge(attachment)}
              </span>
            </span>
            <span className="block truncate text-[11px] text-gray-500">
              {contextPreview(attachment.text)}
            </span>
          </span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition ${
              expanded ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-gray-700 focus:outline-none focus-visible:ring-2 ${tone.focus}`}
          aria-label="Remove context"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      {expanded && (
        <pre
          className={`max-h-36 overflow-y-auto whitespace-pre-wrap border-t px-3 py-2 font-sans text-[11px] leading-relaxed text-gray-600 ${tone.expanded}`}
        >
          {attachment.text}
        </pre>
      )}
    </div>
  )
}

/**
 * Split the answer into paragraphs, keeping inline citation tokens in the text
 * so the renderer can place each reference exactly where the model cited it.
 * Each paragraph carries only the citations it actually references.
 */
function buildParagraphs(
  text: string,
  citations: BackendCitation[],
): AnswerParagraph[] {
  const byId = new Map(
    citations.map((c) => [c.chunkId.toLowerCase(), toCitation(c)]),
  )
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => ({
      id: crypto.randomUUID(),
      text: block,
      citations: citedIn(block, byId),
    }))
}

export default function ChatPanel({
  chunkSet,
  documentId,
  contextDocumentIds,
  contextAttachments,
  onContextAttachmentsChange,
  onCitationClick,
  onSourceClick,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingActive, setStreamingActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedAttachmentIds, setExpandedAttachmentIds] = useState<Set<string>>(
    () => new Set(),
  )

  const { displayed, push, reset } = useStreamingText()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`
  }, [input])

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && contextAttachments.length === 0) || loading) return

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text || 'Use this context.',
      contextAttachments: contextAttachments.length
        ? [...contextAttachments]
        : undefined,
    }
    const history = [...messages, userMessage]

    setMessages(history)
    setInput('')
    onContextAttachmentsChange([])
    setExpandedAttachmentIds(new Set())
    setError(null)
    setLoading(true)
    pinnedRef.current = true
    maybeScroll()

    reset()
    let full = ''
    try {
      // Scope retrieval to the documents checked into context; when none are
      // checked, fall back to the currently-open document.
      const documentIds =
        contextDocumentIds && contextDocumentIds.length > 0
          ? contextDocumentIds
          : documentId
            ? [documentId]
            : []
      const citations = await sendChatStream(
        history,
        (delta) => {
          full += delta
          push(delta)
          if (!streamingActive) setStreamingActive(true)
        },
        { documentIds },
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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text').trim()
    if (pasted.length <= 200) return
    e.preventDefault()
    onContextAttachmentsChange([
      ...contextAttachments,
      {
        id: crypto.randomUUID(),
        text: pasted,
        label: 'Pasted context',
        createdFrom: 'paste',
      },
    ])
  }

  const removeAttachment = (id: string) => {
    onContextAttachmentsChange(
      contextAttachments.filter((attachment) => attachment.id !== id),
    )
    setExpandedAttachmentIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  const toggleAttachment = (id: string) => {
    setExpandedAttachmentIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
          <div className="flex justify-start px-1 py-1">
            <TypingDots />
          </div>
        )}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        {contextAttachments.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {contextAttachments.map((attachment) => (
              <ContextAttachmentPill
                key={attachment.id}
                attachment={attachment}
                expanded={expandedAttachmentIds.has(attachment.id)}
                onToggle={() => toggleAttachment(attachment.id)}
                onRemove={() => removeAttachment(attachment.id)}
              />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={loading}
            placeholder={
              contextAttachments.length
                ? 'Ask about the attached context…'
                : 'Ask anything about your sources…'
            }
            className="max-h-28 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-5 text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || (!input.trim() && contextAttachments.length === 0)}
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
            Answers are grounded in{' '}
            {contextDocumentIds && contextDocumentIds.length > 0
              ? `your ${contextDocumentIds.length} context source${
                  contextDocumentIds.length > 1 ? 's' : ''
                }`
              : documentId
                ? 'this document'
                : 'your documents'}{' '}
            via retrieval.
          </p>
        )}
      </div>
    </main>
  )
}
