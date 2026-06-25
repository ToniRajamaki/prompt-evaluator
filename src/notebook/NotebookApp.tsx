import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import FileViewer from './components/FileViewer'
import { sourceFiles } from './fileRegistry'

export default function NotebookApp() {
  const [selectedId, setSelectedId] = useState<string | null>(
    sourceFiles[0]?.id ?? null,
  )
  const selected = sourceFiles.find((f) => f.id === selectedId) ?? null

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold">PDF Notebook</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
        <div className="flex-1 overflow-hidden border-r border-gray-200">
          <FileViewer file={selected} />
        </div>
        <div className="flex w-96 flex-col">
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
