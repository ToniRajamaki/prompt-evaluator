import { chatMessages } from '../mockData'
import ChatMessage from './ChatMessage'

export default function ChatPanel() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chatMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask something about your PDFs…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}
