import type { ChatMessage as ChatMessageType } from '../types'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-indigo-600 text-white'
            : 'rounded-2xl rounded-bl-md border border-gray-200 bg-white text-gray-700'
        }`}
      >
        {message.text}
      </div>
    </div>
  )
}
