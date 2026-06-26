import ReactMarkdown from 'react-markdown'
import type { ChatMessage as ChatMessageType } from '../types'

interface ChatMessageProps {
  message: ChatMessageType
  streaming?: boolean
}

export default function ChatMessage({ message, streaming = false }: ChatMessageProps) {
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

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-700 shadow-sm">
        <div className="prose prose-sm max-w-none prose-pre:my-2 prose-p:my-1.5 first:prose-p:mt-0 last:prose-p:mb-0">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
        {streaming && <span className="chat-caret bg-gray-500">&nbsp;</span>}
      </div>
    </div>
  )
}
