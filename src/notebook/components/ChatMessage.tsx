import ReactMarkdown from 'react-markdown'
import type { ChatMessage as ChatMessageType, Citation } from '../types'
import CitationPill from './CitationPill'

interface ChatMessageProps {
  message: ChatMessageType
  streaming?: boolean
  onCitationClick?: (citation: Citation) => void
}

export default function ChatMessage({
  message,
  streaming = false,
  onCitationClick,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm">
          {message.text}
        </div>
      </div>
    )
  }

  const hasStructured = !streaming && !!message.paragraphs?.length

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-700 shadow-sm">
        {hasStructured ? (
          <div className="space-y-3">
            {message.paragraphs!.map((para) => (
              <div key={para.id}>
                <p className="whitespace-pre-wrap">{para.text}</p>
                {para.citations.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {para.citations.map((citation) => (
                      <CitationPill
                        key={citation.id}
                        citation={citation}
                        onClick={onCitationClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none prose-pre:my-2 prose-p:my-1.5 first:prose-p:mt-0 last:prose-p:mb-0">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
        {streaming && <span className="chat-caret bg-gray-500">&nbsp;</span>}
      </div>
    </div>
  )
}
