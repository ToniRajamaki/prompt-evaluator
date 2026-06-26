import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Chunk } from '../types'
import { colorFor } from '../data/chunksRegistry'
import { computeChunkHighlights } from './pdfChunkMap'
import type { ChunkRectsByPage } from './pdfChunkMap'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

interface PdfViewerProps {
  url: string
  chunks?: Chunk[]
  hoveredChunkId?: string | null
  activeChunkId?: string | null
  onChunkClick?: (chunkId: string) => void
}

const SCALE = 1.4

export default function PdfViewer({
  url,
  chunks,
  hoveredChunkId,
  activeChunkId,
  onChunkClick,
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlights, setHighlights] = useState<ChunkRectsByPage>({})

  const chunkIndexById = useMemo(() => {
    const m = new Map<string, number>()
    chunks?.forEach((c, i) => m.set(c.id, i))
    return m
  }, [chunks])

  // Load + render PDF
  useEffect(() => {
    let cancelled = false
    const scroll = scrollRef.current
    if (!scroll) return

    // Clear previous pages
    const pagesHost = scroll.querySelector('[data-pages-host]') as HTMLElement | null
    if (pagesHost) pagesHost.innerHTML = ''
    pageRefs.current.clear()
    setError(null)
    setLoading(true)
    setHighlights({})

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then(async (pdf) => {
        const viewports: Record<number, pdfjsLib.PageViewport> = {}

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: SCALE })
          viewports[pageNum] = viewport

          const wrapper = document.createElement('div')
          wrapper.className =
            'relative mx-auto mb-6 shadow border border-gray-200 bg-white'
          wrapper.style.width = `${viewport.width}px`
          wrapper.style.height = `${viewport.height}px`
          wrapper.setAttribute('data-page', String(pageNum))

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          const dpr = window.devicePixelRatio || 1
          canvas.width = viewport.width * dpr
          canvas.height = viewport.height * dpr
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.className = 'block'
          ctx.scale(dpr, dpr)

          wrapper.appendChild(canvas)
          if (pagesHost) pagesHost.appendChild(wrapper)
          pageRefs.current.set(pageNum, wrapper)

          await page.render({ canvasContext: ctx, viewport, canvas }).promise
        }

        if (cancelled) return
        setLoading(false)

        if (chunks?.length) {
          const map = await computeChunkHighlights(pdf, chunks, viewports)
          if (!cancelled) setHighlights(map)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [url, chunks])

  // Scroll active chunk into view
  useEffect(() => {
    if (!activeChunkId) return
    const pageNum = Object.keys(highlights).find((p) =>
      highlights[Number(p)].some((h) => h.chunkId === activeChunkId),
    )
    if (!pageNum) return
    const entry = highlights[Number(pageNum)].find(
      (h) => h.chunkId === activeChunkId,
    )
    const wrapper = pageRefs.current.get(Number(pageNum))
    if (!wrapper || !entry || !entry.rects.length || !scrollRef.current) return
    const minTop = Math.min(...entry.rects.map((r) => r.top))
    const target = wrapper.offsetTop + minTop - 80
    scrollRef.current.scrollTo({ top: target, behavior: 'smooth' })
  }, [activeChunkId, highlights])

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-gray-100 p-4">
      {loading && <p className="text-sm text-gray-500">Loading PDF…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      <div data-pages-host />

      {/* Highlight overlays — portal-like rendering using page wrappers via fixed positioning relative to wrapper offsets */}
      <Overlays
        highlights={highlights}
        pageRefs={pageRefs}
        hoveredChunkId={hoveredChunkId ?? null}
        activeChunkId={activeChunkId ?? null}
        chunkIndexById={chunkIndexById}
        onChunkClick={onChunkClick}
      />
    </div>
  )
}

interface OverlaysProps {
  highlights: ChunkRectsByPage
  pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>
  hoveredChunkId: string | null
  activeChunkId: string | null
  chunkIndexById: Map<string, number>
  onChunkClick?: (chunkId: string) => void
}

function Overlays({
  highlights,
  pageRefs,
  hoveredChunkId,
  activeChunkId,
  chunkIndexById,
  onChunkClick,
}: OverlaysProps) {
  // We render highlight divs as children of each page wrapper using effects.
  useOverlayPainter({
    highlights,
    pageRefs,
    hoveredChunkId,
    activeChunkId,
    chunkIndexById,
    onChunkClick,
  })
  return null
}

function useOverlayPainter({
  highlights,
  pageRefs,
  hoveredChunkId,
  activeChunkId,
  chunkIndexById,
  onChunkClick,
}: OverlaysProps) {
  useEffect(() => {
    const cleanups: Array<() => void> = []

    for (const [pageStr, entries] of Object.entries(highlights)) {
      const pageNum = Number(pageStr)
      const wrapper = pageRefs.current.get(pageNum)
      if (!wrapper) continue

      // Remove old overlay layer
      const existing = wrapper.querySelector('[data-overlay-layer]')
      if (existing) existing.remove()

      const layer = document.createElement('div')
      layer.setAttribute('data-overlay-layer', '')
      layer.style.position = 'absolute'
      layer.style.inset = '0'
      layer.style.pointerEvents = 'none'

      for (const entry of entries) {
        const idx = chunkIndexById.get(entry.chunkId) ?? 0
        const color = colorFor(idx)
        const isHovered = hoveredChunkId === entry.chunkId
        const isActive = activeChunkId === entry.chunkId
        const isDimmed =
          (hoveredChunkId && !isHovered) ||
          (activeChunkId && !isActive && !hoveredChunkId)

        for (const rect of entry.rects) {
          const div = document.createElement('div')
          div.style.position = 'absolute'
          div.style.left = `${rect.left}px`
          div.style.top = `${rect.top}px`
          div.style.width = `${rect.width}px`
          div.style.height = `${rect.height}px`
          div.style.background = color.bg
          div.style.borderRadius = '2px'
          div.style.transition = 'all 120ms ease'
          div.style.cursor = 'pointer'
          div.style.pointerEvents = 'auto'
          if (isActive) {
            div.style.boxShadow = `0 0 0 2px ${color.ring}`
          }
          if (isHovered) {
            div.style.boxShadow = `0 0 0 2px ${color.ring}, 0 2px 6px rgba(0,0,0,0.15)`
            div.style.filter = 'brightness(1.05)'
          }
          if (isDimmed) {
            div.style.opacity = '0.25'
          }
          div.title = `Chunk ${idx + 1}`
          div.addEventListener('click', () => onChunkClick?.(entry.chunkId))
          layer.appendChild(div)
        }
      }
      wrapper.appendChild(layer)
      cleanups.push(() => layer.remove())
    }

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [highlights, pageRefs, hoveredChunkId, activeChunkId, chunkIndexById, onChunkClick])
}
