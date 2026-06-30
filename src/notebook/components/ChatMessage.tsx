import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage as ChatMessageType, Citation } from '../types'
import CitationPill from './CitationPill'

interface ChatMessageProps {
  message: ChatMessageType
  streaming?: boolean
  onCitationClick?: (citation: Citation) => void
  onSourceClick?: (fileName: string) => void
}

function sourceKind(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function sourceIconColor(kind: string): string {
  if (kind === 'pdf') return 'text-rose-500'
  if (kind === 'md') return 'text-sky-500'
  return 'text-gray-500'
}

interface ChatMarkdownProps {
  children: string
  tone?: 'assistant' | 'user'
}

function ChatMarkdown({ children, tone = 'assistant' }: ChatMarkdownProps) {
  const toneClasses =
    tone === 'user'
      ? 'prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900 prose-a:text-indigo-700'
      : 'prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-900 prose-a:text-indigo-700'

  return (
    <div
      className={`prose prose-sm max-w-none break-words prose-p:my-1.5 prose-pre:my-2 prose-pre:whitespace-pre-wrap prose-ol:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${toneClasses}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

export default function ChatMessage({
  message,
  streaming = false,
  onCitationClick,
  onSourceClick,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const contextSources = message.paragraphs
    ?.flatMap((para) => para.citations)
    .filter(
      (citation, index, citations) =>
        citations.findIndex(
          (candidate) => candidate.fileName === citation.fileName,
        ) === index,
    )

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
          <ChatMarkdown tone="user">{message.text}</ChatMarkdown>
        </div>
      </div>
    )
  }

  const hasStructured = !streaming && !!message.paragraphs?.length

  return (
    <div className="flex justify-start">
      <div className="w-full px-1 py-1 text-sm leading-relaxed text-gray-700">
        {hasStructured ? (
          <div className="space-y-3">
            {!!contextSources?.length && (
              <details className="group rounded-xl border border-gray-200 bg-white/70">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:text-gray-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 6h16" />
                      <path d="M4 12h10" />
                      <path d="M4 18h7" />
                    </svg>
                    Sources in context
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    {contextSources.length}{' '}
                    {contextSources.length === 1 ? 'source' : 'sources'}
                    <svg
                      className="h-3.5 w-3.5 transition group-open:rotate-180"
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
                  </span>
                </summary>
                <div className="flex flex-col border-t border-gray-100 px-1.5 py-1.5">
                  {contextSources.map((source) => {
                    const kind = sourceKind(source.fileName)
                    return (
                      <button
                        key={source.fileName}
                        type="button"
                        onClick={() => onSourceClick?.(source.fileName)}
                        className="group flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                        title={source.fileName}
                      >
                        <svg
                          className={`h-3.5 w-3.5 shrink-0 ${sourceIconColor(kind)}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <span className="min-w-0 flex-1 truncate">
                          {source.fileName}
                        </span>
                        <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] font-medium uppercase text-gray-400 group-hover:text-gray-500">
                          {kind}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </details>
            )}
            {message.paragraphs!.map((para) => (
              <div key={para.id} className="space-y-1">
                <ChatMarkdown>{para.text}</ChatMarkdown>
                {para.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {para.citations.map((citation) => (
                      <CitationPill
                        key={citation.id}
                        citation={citation}
                        onClick={onCitationClick}
                        variant="inline"
                      />
                    ))}
                  </div>
                )}
                {para.citations.length > 0 && (
                  <span className="sr-only">
                    Sources: {para.citations.map((c) => c.fileName).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ChatMarkdown>{message.text}</ChatMarkdown>
        )}
        {streaming && <span className="chat-caret bg-gray-500">&nbsp;</span>}
      </div>
    </div>
  )
}
