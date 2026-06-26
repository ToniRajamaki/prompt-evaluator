export default function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Assistant is typing">
      <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
      <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
      <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
    </span>
  )
}
