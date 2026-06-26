import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { SourceFolder } from '../types'

interface FolderItemProps {
  folder: SourceFolder
  depth: number
  isOpen: boolean
  isDragOver: boolean
  onToggleExpand: (id: string) => void
  onMove: (nodeId: string, targetFolderId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDragOver: (id: string | null) => void
}

const INDENT = 14

export default function FolderItem({
  folder,
  depth,
  isOpen,
  isDragOver,
  onToggleExpand,
  onMove,
  onRename,
  onDelete,
  onDragOver,
}: FolderItemProps) {
  const [editing, setEditing] = useState(folder.name === '')
  const [name, setName] = useState(folder.name || 'New folder')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const next = name.trim() || 'Untitled folder'
    setName(next)
    onRename(folder.id, next)
    setEditing(false)
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/folder-id', folder.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onDragOver(null)
    const sourceId = e.dataTransfer.getData('text/source-id')
    const folderId = e.dataTransfer.getData('text/folder-id')
    const draggedId = sourceId || folderId
    if (draggedId && draggedId !== folder.id) {
      onMove(draggedId, folder.id)
      if (!isOpen) onToggleExpand(folder.id)
    }
  }

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(folder.id)
      }}
      onDragLeave={() => onDragOver(null)}
      onDrop={handleDrop}
      onClick={() => !editing && onToggleExpand(folder.id)}
      className={`group flex h-8 cursor-pointer select-none items-center gap-1 rounded-md px-1.5 text-sm transition ${
        isDragOver ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-100'
      }`}
      style={{ paddingLeft: depth * INDENT + 4 }}
    >
      <svg
        className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
          isOpen ? 'rotate-90' : ''
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
      <svg
        className="h-3.5 w-3.5 shrink-0 text-amber-500"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        {isOpen ? (
          <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" opacity="0.55" />
        ) : (
          <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
        )}
      </svg>

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 rounded border border-blue-300 px-1 text-sm outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate font-medium text-gray-700">{name}</span>
      )}

      {!editing && (
        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
          <button
            type="button"
            title="Delete folder"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folder.id)
            }}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-rose-600"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </span>
      )}
    </div>
  )
}
