import type { SourceNode } from '../types'
import SourceItem from './SourceItem'
import FolderItem from './FolderItem'

interface SourceTreeProps {
  nodes: SourceNode[]
  depth: number
  expanded: Set<string>
  dragOverId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string) => void
  onMove: (nodeId: string, targetFolderId: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onDragOver: (id: string | null) => void
}

export default function SourceTree(props: SourceTreeProps) {
  const { nodes, depth, expanded } = props

  return (
    <ul className="flex flex-col">
      {nodes.map((node) => {
        if (node.kind === 'folder') {
          const isOpen = expanded.has(node.folder.id)
          return (
            <li key={node.folder.id}>
              <FolderItem
                folder={node.folder}
                depth={depth}
                isOpen={isOpen}
                isDragOver={props.dragOverId === node.folder.id}
                onToggleExpand={props.onToggleExpand}
                onMove={props.onMove}
                onRename={props.onRenameFolder}
                onDelete={props.onDeleteFolder}
                onDragOver={props.onDragOver}
              />
              {isOpen && node.children.length > 0 && (
                <SourceTree {...props} nodes={node.children} depth={depth + 1} />
              )}
            </li>
          )
        }

        return (
          <li key={node.source.id}>
            <SourceItem
              source={node.source}
              depth={depth}
              active={props.selectedId === node.source.id}
              onSelect={props.onSelect}
              onToggleSelect={props.onToggleSelect}
              onMove={props.onMove}
            />
          </li>
        )
      })}
    </ul>
  )
}
