import type { ChatMessage as ChatMessageType } from '../types'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-lg rounded px-3 py-2 text-sm ${
          isUser
            ? 'bg-gray-800 text-white'
            : 'border border-gray-200 bg-white text-gray-800'
        }`}
      >
        {message.text}
      </div>
    </div>
  )
}
