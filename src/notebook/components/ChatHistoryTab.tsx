import { chatHistory } from '../mockData'

export default function ChatHistoryTab() {
  return (
    <div className="flex flex-col gap-1.5 p-3">
      {chatHistory.map((item) => (
        <button
          key={item.id}
          type="button"
          className="rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-gray-200 hover:bg-gray-50"
        >
          <span className="block text-sm font-medium text-gray-800">{item.title}</span>
          <span className="text-xs text-gray-400">{item.updatedAt}</span>
        </button>
      ))}
    </div>
  )
}
