import { useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { PdfSource, SourceFolder, SourceNode } from '../types'
import DropZone from './DropZone'
import SourceTree from './SourceTree'
import ContextSection from './ContextSection'

function buildTree(
  folders: SourceFolder[],
  sources: PdfSource[],
  parentId: string | null,
): SourceNode[] {
  const folderNodes: SourceNode[] = folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({
      kind: 'folder',
      folder,
      children: buildTree(folders, sources, folder.id),
    }))

  const fileNodes: SourceNode[] = sources
    .filter((s) => s.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((source) => ({ kind: 'file', source }))

  return [...folderNodes, ...fileNodes]
}

function isDescendant(
  folders: SourceFolder[],
  folderId: string,
  maybeAncestorId: string,
): boolean {
  let current = folders.find((f) => f.id === folderId)?.parentId ?? null
  while (current) {
    if (current === maybeAncestorId) return true
    current = folders.find((f) => f.id === current)?.parentId ?? null
  }
  return false
}

function hasAncestor(
  folders: SourceFolder[],
  folderId: string | null,
  predicate: (folder: SourceFolder) => boolean,
): boolean {
  let current = folderId
  while (current) {
    const folder = folders.find((f) => f.id === current)
    if (!folder) return false
    if (predicate(folder)) return true
    current = folder.parentId
  }
  return false
}

function isSourceInFolder(
  folders: SourceFolder[],
  source: PdfSource,
  folderId: string,
): boolean {
  return hasAncestor(folders, source.parentId, (folder) => folder.id === folderId)
}

interface SourcesTabProps {
  selectedId: string | null
  onSelect: (id: string) => void
  folders: SourceFolder[]
  setFolders: React.Dispatch<React.SetStateAction<SourceFolder[]>>
  sources: PdfSource[]
  setSources: React.Dispatch<React.SetStateAction<PdfSource[]>>
  onUpload?: (file: File) => void | Promise<void>
  onDelete?: (id: string) => void
  onShowInfo?: (id: string) => void
  uploadDisabled?: boolean
}

export default function SourcesTab({
  selectedId,
  onSelect,
  folders,
  setFolders,
  sources,
  setSources,
  onUpload,
  onDelete,
  onShowInfo,
  uploadDisabled,
}: SourcesTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id)),
  )
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [rootDragOver, setRootDragOver] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const selectedContextFolders = useMemo(
    () =>
      folders.filter(
        (folder) =>
          folder.selected &&
          !hasAncestor(folders, folder.parentId, (ancestor) => Boolean(ancestor.selected)),
      ),
    [folders],
  )

  const tree = useMemo(
    () =>
      buildTree(
        folders.filter(
          (folder) =>
            !folder.selected &&
            !hasAncestor(folders, folder.parentId, (ancestor) => Boolean(ancestor.selected)),
        ),
        sources.filter(
          (source) =>
            !source.selected &&
            !hasAncestor(folders, source.parentId, (folder) => Boolean(folder.selected)),
        ),
        null,
      ),
    [folders, sources],
  )

  const contextSources = useMemo(
    () =>
      sources.filter(
        (source) =>
          source.selected &&
          !hasAncestor(folders, source.parentId, (folder) => Boolean(folder.selected)),
      ),
    [folders, sources],
  )

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelect = (id: string) =>
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    )

  const toggleFolderSelect = (id: string) => {
    const shouldSelect = !folders.find((f) => f.id === id)?.selected
    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.id === id) return { ...folder, selected: shouldSelect }
        if (shouldSelect && isDescendant(prev, folder.id, id)) {
          return { ...folder, selected: false }
        }
        return folder
      }),
    )
    if (shouldSelect) {
      setSources((prev) =>
        prev.map((source) =>
          isSourceInFolder(folders, source, id) ? { ...source, selected: false } : source,
        ),
      )
    }
  }

  const move = (nodeId: string, targetFolderId: string | null) => {
    const isFolder = folders.some((f) => f.id === nodeId)
    if (isFolder) {
      if (nodeId === targetFolderId) return
      if (targetFolderId && isDescendant(folders, targetFolderId, nodeId)) return
      setFolders((prev) =>
        prev.map((f) => (f.id === nodeId ? { ...f, parentId: targetFolderId } : f)),
      )
    } else {
      setSources((prev) =>
        prev.map((s) => (s.id === nodeId ? { ...s, parentId: targetFolderId } : s)),
      )
    }
  }

  const createFolder = () => {
    const id = `f-${Date.now()}`
    setFolders((prev) => [...prev, { id, name: '', parentId: null }])
  }

  const renameFolder = (id: string, name: string) =>
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)))

  const deleteFolder = (id: string) => {
    const parentId = folders.find((f) => f.id === id)?.parentId ?? null
    setFolders((prev) =>
      prev
        .filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId } : f)),
    )
    setSources((prev) =>
      prev.map((s) => (s.parentId === id ? { ...s, parentId } : s)),
    )
  }

  const handleRootDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setRootDragOver(false)
    const draggedId =
      e.dataTransfer.getData('text/source-id') ||
      e.dataTransfer.getData('text/folder-id')
    if (draggedId) move(draggedId, null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Files
          </span>
          <div className="flex items-center gap-0.5">
            <input
              ref={addInputRef}
              type="file"
              accept=".pdf,.md,.txt"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files
                if (files && onUpload) {
                  Array.from(files).forEach((f) => void onUpload(f))
                }
                if (addInputRef.current) addInputRef.current.value = ''
              }}
            />
            <button
              type="button"
              title="Add source"
              disabled={uploadDisabled}
              onClick={() => addInputRef.current?.click()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add source
            </button>
            <button
              type="button"
              onClick={createFolder}
              title="New folder"
              className="flex items-center justify-center rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
                <path d="M12 11v6M9 14h6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setRootDragOver(true)
          }}
          onDragLeave={() => setRootDragOver(false)}
          onDrop={handleRootDrop}
          className={`min-h-[60px] rounded-lg ${
            rootDragOver ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''
          }`}
        >
          <SourceTree
            nodes={tree}
            depth={0}
            expanded={expanded}
            dragOverId={dragOverId}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggleExpand={toggleExpand}
            onToggleSelect={toggleSelect}
            onToggleFolderSelect={toggleFolderSelect}
            onMove={move}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onDragOver={setDragOverId}
            onShowInfo={onShowInfo}
            onDelete={onDelete}
          />
        </div>

        <ContextSection
          folders={selectedContextFolders}
          sources={contextSources}
          selectedId={selectedId}
          onSelect={onSelect}
          onRemoveSource={toggleSelect}
          onRemoveFolder={toggleFolderSelect}
        />
      </div>

      <div className="border-t border-gray-100 p-3">
        <DropZone onUpload={onUpload} disabled={uploadDisabled} />
      </div>
    </div>
  )
}
