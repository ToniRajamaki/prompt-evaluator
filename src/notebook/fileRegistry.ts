import type { SourceFile, SourceKind } from './types'

const modules = import.meta.glob('/files/**/*.{pdf,md,txt}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

function kindFromName(name: string): SourceKind | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'md') return 'md'
  if (ext === 'txt') return 'txt'
  return null
}

export const sourceFiles: SourceFile[] = Object.entries(modules)
  .map(([path, url]) => {
    const name = path.split('/').pop() ?? path
    const kind = kindFromName(name)
    if (!kind) return null
    return { id: path, name, url, kind }
  })
  .filter((f): f is SourceFile => f !== null)
  .sort((a, b) => a.name.localeCompare(b.name))
