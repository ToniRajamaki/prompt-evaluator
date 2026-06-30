import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteDocument,
  fileUrl,
  listDocuments,
  uploadDocument,
  type BackendDocument,
} from '../api/documents'
import { sourceFiles } from '../fileRegistry'

/** A document plus a viewer URL and which backend it came from. */
export interface DocumentEntry extends BackendDocument {
  url: string
  backed: 'backend' | 'static'
}

const POLL_INTERVAL_MS = 1500

/** Static demo files used when the backend is unreachable. */
const staticEntries: DocumentEntry[] = sourceFiles.map((f) => ({
  id: f.id,
  name: f.name,
  kind: f.kind,
  status: 'ready',
  pageCount: 0,
  chunkCount: 0,
  vectorizedCount: 0,
  error: null,
  createdAt: null,
  url: f.url,
  backed: 'static',
}))

function toEntry(doc: BackendDocument): DocumentEntry {
  return { ...doc, url: fileUrl(doc.id), backed: 'backend' }
}

export function useDocuments() {
  const [entries, setEntries] = useState<DocumentEntry[]>([])
  const [backendUp, setBackendUp] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const docs = await listDocuments()
      setEntries(docs.map(toEntry))
      setBackendUp(true)
      setError(null)
    } catch {
      // Backend down: fall back to the bundled demo files so the UI still works.
      setBackendUp(false)
      setEntries(staticEntries)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Poll while any document is still being ingested.
  useEffect(() => {
    const anyProcessing = entries.some(
      (e) => e.status === 'pending' || e.status === 'processing',
    )
    if (!anyProcessing || !backendUp) {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current)
        pollRef.current = null
      }
      return
    }
    pollRef.current = window.setTimeout(() => void refresh(), POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [entries, backendUp, refresh])

  const upload = useCallback(
    async (file: File) => {
      setError(null)
      try {
        const doc = await uploadDocument(file)
        setEntries((prev) => {
          const next = prev.filter((e) => e.id !== doc.id)
          return [...next, toEntry(doc)].sort((a, b) =>
            a.name.localeCompare(b.name),
          )
        })
        void refresh()
        return doc
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        throw err
      }
    },
    [refresh],
  )

  const remove = useCallback(async (id: string) => {
    await deleteDocument(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { entries, backendUp, loading, error, refresh, upload, remove }
}
