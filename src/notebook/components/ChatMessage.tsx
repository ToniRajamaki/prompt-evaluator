import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Children, cloneElement, isValidElement, type ReactElement } from 'react'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'
import type {
  ChatContextAttachment,
  ChatMessage as ChatMessageType,
  Citation,
} from '../types'
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
  citations?: Citation[]
  onCitationClick?: (citation: Citation) => void
}

function ChatMarkdown({
  children,
  tone = 'assistant',
  citations = [],
  onCitationClick,
}: ChatMarkdownProps) {
  const toneClasses =
    tone === 'user'
      ? 'prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900 prose-a:text-indigo-700'
      : 'prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-900 prose-a:text-indigo-700'
  const components: Components =
    citations.length > 0
      ? {
          p: ({ children, ...props }) => (
            <p {...props}>
              {renderMarkdownNodeWithCitations(
                children,
                citations,
                onCitationClick,
              )}
            </p>
          ),
          li: ({ children, ...props }) => (
            <li {...props}>
              {renderMarkdownNodeWithCitations(
                children,
                citations,
                onCitationClick,
              )}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote {...props}>
              {renderMarkdownNodeWithCitations(
                children,
                citations,
                onCitationClick,
              )}
            </blockquote>
          ),
          td: ({ children, ...props }) => (
            <td {...props}>
              {renderMarkdownNodeWithCitations(
                children,
                citations,
                onCitationClick,
              )}
            </td>
          ),
          th: ({ children, ...props }) => (
            <th {...props}>
              {renderMarkdownNodeWithCitations(
                children,
                citations,
                onCitationClick,
              )}
            </th>
          ),
        }
      : {}

  return (
    <div
      className={`prose prose-sm max-w-none break-words prose-p:my-1.5 prose-pre:my-2 prose-pre:whitespace-pre-wrap prose-ol:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${toneClasses}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

function contextPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 72 ? `${normalized.slice(0, 72)}…` : normalized
}

function displayLabel(attachment: ChatContextAttachment): string {
  return attachment.label.replace(/\.(pdf|md|txt)$/i, '')
}

function sourceBadge(attachment: ChatContextAttachment): string {
  if (attachment.sourceKind) return attachment.sourceKind.toUpperCase()
  return attachment.createdFrom === 'paste' ? 'PASTE' : 'TEXT'
}

function userContextTone(attachment: ChatContextAttachment) {
  if (attachment.sourceKind === 'pdf') {
    return {
      shell: 'border-rose-100 bg-rose-50/70',
      icon: 'text-rose-600 ring-rose-100',
      badge: 'text-rose-600 ring-rose-100',
    }
  }
  if (attachment.sourceKind === 'md') {
    return {
      shell: 'border-sky-100 bg-sky-50/70',
      icon: 'text-sky-600 ring-sky-100',
      badge: 'text-sky-600 ring-sky-100',
    }
  }
  if (attachment.sourceKind === 'txt') {
    return {
      shell: 'border-gray-200 bg-gray-50/80',
      icon: 'text-gray-500 ring-gray-200',
      badge: 'text-gray-500 ring-gray-200',
    }
  }
  return {
    shell: 'border-violet-100 bg-violet-50/70',
    icon: 'text-violet-600 ring-violet-100',
    badge: 'text-violet-600 ring-violet-100',
  }
}

function UserContextSummary({
  attachments,
}: {
  attachments: ChatContextAttachment[]
}) {
  if (!attachments.length) return null
  return (
    <div className="mb-2 space-y-1.5">
      {attachments.map((attachment) => {
        const tone = userContextTone(attachment)
        return (
          <details
            key={attachment.id}
            className={`group rounded-xl border text-xs text-gray-700 shadow-sm ${tone.shell}`}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
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
                    className={`shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${tone.badge}`}
                  >
                    {sourceBadge(attachment)}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-gray-500">
                  {contextPreview(attachment.text)}
                </span>
              </span>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-open:rotate-180"
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
            </summary>
            <pre
              className={`max-h-36 overflow-y-auto whitespace-pre-wrap border-t px-3 py-2 font-sans text-[11px] leading-relaxed text-gray-600 ${tone.shell.split(' ')[0]}`}
            >
              {attachment.text}
            </pre>
          </details>
        )
      })}
    </div>
  )
}

/** Matches a bracketed citation token; the inner group may list several ids. */
const CITATION_TOKEN_RE = /\[([^\]\n]+?)\]/g

/**
 * Render answer text, replacing each inline `[chunk-id]` token with a clickable
 * citation pill placed exactly where the model cited it. Tokens that don't map
 * to a known citation are left as plain text.
 */
function renderWithCitations(
  text: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void,
): ReactNode[] {
  const byId = new Map(citations.map((c) => [c.chunkId.toLowerCase(), c]))
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  CITATION_TOKEN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CITATION_TOKEN_RE.exec(text))) {
    const matched: Citation[] = []
    const seen = new Set<string>()
    for (const raw of match[1].split(/[,;]/)) {
      const citation = byId.get(raw.trim().toLowerCase())
      if (citation && !seen.has(citation.chunkId)) {
        matched.push(citation)
        seen.add(citation.chunkId)
      }
    }
    if (!matched.length) continue
    if (match.index > last) nodes.push(text.slice(last, match.index))
    for (const citation of matched) {
      nodes.push(
        <CitationPill
          key={`cite-${key++}`}
          citation={citation}
          onClick={onCitationClick}
          variant="inline"
        />,
      )
    }
    last = CITATION_TOKEN_RE.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderMarkdownNodeWithCitations(
  node: ReactNode,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void,
): ReactNode {
  if (typeof node === 'string') {
    return renderWithCitations(node, citations, onCitationClick)
  }

  if (Array.isArray(node)) {
    return Children.map(node, (child) =>
      renderMarkdownNodeWithCitations(child, citations, onCitationClick),
    )
  }

  if (!isValidElement(node)) {
    return node
  }

  if (node.type === 'code' || node.type === 'pre') {
    return node
  }

  const element = node as ReactElement<{ children?: ReactNode }>
  if (!element.props.children) {
    return element
  }

  return cloneElement(element, {
    children: Children.map(element.props.children, (child) =>
      renderMarkdownNodeWithCitations(child, citations, onCitationClick),
    ),
  })
}

function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>()
  return citations.filter((citation) => {
    if (seen.has(citation.chunkId)) return false
    seen.add(citation.chunkId)
    return true
  })
}

function uniqueByFileName(citations: Citation[]): Citation[] {
  const seen = new Set<string>()
  return citations.filter((citation) => {
    if (seen.has(citation.fileName)) return false
    seen.add(citation.fileName)
    return true
  })
}

export default function ChatMessage({
  message,
  streaming = false,
  onCitationClick,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const inlineContextSources = message.paragraphs
    ?.flatMap((para) => para.citations)
    .filter(
      (citation, index, citations) =>
        citations.findIndex(
          (candidate) => candidate.fileName === citation.fileName,
        ) === index,
    )
  // When the model omits inline `[id]` tokens, still surface the sources the
  // backend actually retrieved for this answer so references never disappear.
  const fallbackSources = uniqueByFileName(message.sources ?? [])
  const contextSources = inlineContextSources?.length
    ? inlineContextSources
    : fallbackSources
  const citedAnswerMarkdown = message.paragraphs
    ?.map((para) => para.text)
    .join('\n\n')
  const inlineCitations = uniqueCitations(
    message.paragraphs?.flatMap((para) => para.citations) ?? [],
  )

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
          <UserContextSummary attachments={message.contextAttachments ?? []} />
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
                        onClick={() => onCitationClick?.(source)}
                        className="group flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                        title={`${source.fileName} — jump to cited passage`}
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
            <ChatMarkdown
              citations={inlineCitations}
              onCitationClick={onCitationClick}
            >
              {citedAnswerMarkdown ?? message.text}
            </ChatMarkdown>
            {inlineCitations.length > 0 && (
              <span className="sr-only">
                Sources: {inlineCitations.map((c) => c.fileName).join(', ')}
              </span>
            )}
          </div>
        ) : (
          <ChatMarkdown>{message.text}</ChatMarkdown>
        )}
        {streaming && <span className="chat-caret bg-gray-500">&nbsp;</span>}
      </div>
    </div>
  )
}
