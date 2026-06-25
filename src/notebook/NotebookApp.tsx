import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'

export default function NotebookApp() {
  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">PDF Notebook</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatPanel />
      </div>
    </div>
  )
}
