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
        <div className="max-w-lg rounded bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-white">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-lg rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
        <div className="prose prose-sm max-w-none prose-pre:my-2 prose-p:my-1.5 first:prose-p:mt-0 last:prose-p:mb-0">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
        {streaming && <span className="chat-caret bg-gray-500">&nbsp;</span>}
      </div>
    </div>
  )
}
