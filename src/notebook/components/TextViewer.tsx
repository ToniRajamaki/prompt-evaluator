import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Chunk } from '../types'
import { colorFor } from '../data/chunksRegistry'
import { clearHighlights, paintHighlights, stripMarkdown } from './domHighlight'

interface TextViewerProps {
  url: string
  mode: 'md' | 'txt'
  chunks?: Chunk[]
  hoveredChunkId?: string | null
  activeChunkId?: string | null
  onChunkClick?: (chunkId: string) => void
}

export default function TextViewer({
  url,
  mode,
  chunks,
  hoveredChunkId,
  activeChunkId,
  onChunkClick,
}: TextViewerProps) {
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const contentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        setContent(text)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load file')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  // Paint chunk highlights over the rendered content whenever the focused
  // chunk or content changes. Only hovered/active chunks are painted.
  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    if (loading || error) return

    const chunkIndexById = new Map<string, number>()
    chunks?.forEach((c, i) => chunkIndexById.set(c.id, i))

    const focusedIds = new Set(
      [activeChunkId, hoveredChunkId].filter((id): id is string => Boolean(id)),
    )

    // Wait a frame so ReactMarkdown has committed its DOM.
    const raf = requestAnimationFrame(() => {
      paintHighlights(container, chunks ?? [], {
        focusedIds,
        activeChunkId: activeChunkId ?? null,
        hoveredChunkId: hoveredChunkId ?? null,
        styleFor: (chunk) => {
          const idx = chunkIndexById.get(chunk.id) ?? 0
          const c = colorFor(idx)
          return { bg: c.bg, ring: c.ring }
        },
        onChunkClick,
        preprocessNeedle: mode === 'md' ? stripMarkdown : undefined,
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      clearHighlights(container)
    }
  }, [content, loading, error, chunks, hoveredChunkId, activeChunkId, onChunkClick, mode])

  // Scroll the active highlight into view.
  useEffect(() => {
    if (!activeChunkId) return
    const container = contentRef.current
    if (!container) return
    const id = requestAnimationFrame(() => {
      const mark = container.querySelector(`[data-chunk-id="${activeChunkId}"]`)
      mark?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [activeChunkId, content])

  return (
    <div className="h-full overflow-y-auto bg-white p-6">
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && mode === 'md' && (
        <article ref={contentRef} className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      )}
      {!loading && !error && mode === 'txt' && (
        <pre
          ref={contentRef as React.Ref<HTMLPreElement>}
          className="whitespace-pre-wrap font-mono text-sm text-gray-800"
        >
          {content}
        </pre>
      )}
    </div>
  )
}
