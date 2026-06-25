import { chatHistory } from '../mockData'

export default function ChatHistoryTab() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {chatHistory.map((item) => (
        <button
          key={item.id}
          type="button"
          className="rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
        >
          <span className="block font-medium text-gray-800">{item.title}</span>
          <span className="text-xs text-gray-400">{item.updatedAt}</span>
        </button>
      ))}
    </div>
  )
}
