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

const DEFAULT_SCALE = 1.4
const MIN_ZOOM = 0.75
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.25
type ChunkHighlightEntry = ChunkRectsByPage[number][number]

export default function PdfViewer({
  url,
  chunks,
  hoveredChunkId,
  activeChunkId,
  onChunkClick,
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const currentPageRef = useRef(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlights, setHighlights] = useState<ChunkRectsByPage>({})
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)

  const chunkIndexById = useMemo(() => {
    const m = new Map<string, number>()
    chunks?.forEach((c, i) => m.set(c.id, i))
    return m
  }, [chunks])

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Load PDF, lay out placeholder pages, and lazily rasterize only the pages
  // near the viewport. Rendering every page of a large book (hundreds of pages)
  // into its own canvas blows past the browser's per-tab canvas memory budget,
  // so we virtualize: render on scroll-in, free canvases on scroll-out.
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
    setPageCount(0)
    const pageToRestore = currentPageRef.current

    const renderedPages = new Set<number>()
    const renderingPages = new Set<number>()
    let cleanupScroll: (() => void) | null = null

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then(async (pdf) => {
        const viewports: Record<number, pdfjsLib.PageViewport> = {}
        setPageCount(pdf.numPages)

        // Build correctly-sized placeholders for every page. getPage/getViewport
        // is cheap (no rasterization), so this keeps scroll height accurate.
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: DEFAULT_SCALE * zoom })
          viewports[pageNum] = viewport

          const wrapper = document.createElement('div')
          wrapper.className =
            'relative mx-auto mb-6 shadow border border-gray-200 bg-white'
          wrapper.style.width = `${viewport.width}px`
          wrapper.style.height = `${viewport.height}px`
          wrapper.setAttribute('data-page', String(pageNum))

          if (pagesHost) pagesHost.appendChild(wrapper)
          pageRefs.current.set(pageNum, wrapper)
        }

        if (cancelled) return
        setLoading(false)

        const renderPage = async (pageNum: number) => {
          if (cancelled || renderedPages.has(pageNum) || renderingPages.has(pageNum))
            return
          const wrapper = pageRefs.current.get(pageNum)
          const viewport = viewports[pageNum]
          if (!wrapper || !viewport) return
          renderingPages.add(pageNum)
          try {
            const page = await pdf.getPage(pageNum)
            if (cancelled) return
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const dpr = window.devicePixelRatio || 1
            canvas.width = viewport.width * dpr
            canvas.height = viewport.height * dpr
            canvas.style.width = `${viewport.width}px`
            canvas.style.height = `${viewport.height}px`
            canvas.className = 'block'
            canvas.setAttribute('data-page-canvas', '')
            ctx.scale(dpr, dpr)

            // Insert behind any highlight overlay layer.
            wrapper.insertBefore(canvas, wrapper.firstChild)
            await page.render({ canvasContext: ctx, viewport, canvas }).promise
            renderedPages.add(pageNum)
          } catch (err) {
            // Surface unexpected render failures; ignore cancellations.
            if (!cancelled) console.error(`PDF page ${pageNum} render failed`, err)
          } finally {
            renderingPages.delete(pageNum)
          }
        }

        const unrenderPage = (pageNum: number) => {
          const wrapper = pageRefs.current.get(pageNum)
          if (!wrapper) return
          const c = wrapper.querySelector('[data-page-canvas]')
          if (c) c.remove()
          renderedPages.delete(pageNum)
        }

        // Deterministic virtualization driven by scroll position: rasterize the
        // pages whose wrappers fall within the viewport (plus a margin) and free
        // the rest so we never hold more than a handful of canvases at once.
        const MARGIN = 1500
        const updateCurrentPage = () => {
          let closestPage = currentPageRef.current
          let closestDistance = Number.POSITIVE_INFINITY
          const viewportAnchor = scroll.scrollTop + 80

          for (let n = 1; n <= pdf.numPages; n++) {
            const w = pageRefs.current.get(n)
            if (!w) continue
            const distance = Math.abs(w.offsetTop - viewportAnchor)
            if (distance < closestDistance) {
              closestDistance = distance
              closestPage = n
            }
          }

          if (closestPage !== currentPageRef.current) {
            currentPageRef.current = closestPage
            setCurrentPage(closestPage)
          }
        }
        const updateVisible = () => {
          if (cancelled) return
          const top = scroll.scrollTop
          const bottom = top + scroll.clientHeight
          updateCurrentPage()
          for (let n = 1; n <= pdf.numPages; n++) {
            const w = pageRefs.current.get(n)
            if (!w) continue
            const wTop = w.offsetTop
            const wBottom = wTop + w.offsetHeight
            const near = wBottom >= top - MARGIN && wTop <= bottom + MARGIN
            if (near) void renderPage(n)
            else unrenderPage(n)
          }
        }

        let raf = 0
        const onScroll = () => {
          if (raf) return
          raf = requestAnimationFrame(() => {
            raf = 0
            updateVisible()
          })
        }
        scroll.addEventListener('scroll', onScroll, { passive: true })
        cleanupScroll = () => {
          scroll.removeEventListener('scroll', onScroll)
          if (raf) cancelAnimationFrame(raf)
        }
        updateVisible()
        const restorePage = Math.min(pageToRestore, pdf.numPages)
        requestAnimationFrame(() => {
          if (cancelled) return
          pageRefs.current
            .get(restorePage)
            ?.scrollIntoView({ block: 'start', behavior: 'instant' })
          updateVisible()
        })

        // Highlights are a text-only pass (no rasterization), so we can compute
        // them for the whole document up front without the memory blow-up.
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
      cleanupScroll?.()
      loadingTask.destroy()
    }
  }, [url, chunks, zoom])

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

  const goToPage = (pageNumber: number) => {
    const boundedPage = Math.min(Math.max(pageNumber, 1), pageCount || 1)
    pageRefs.current
      .get(boundedPage)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    setCurrentPage(boundedPage)
  }

  const zoomOut = () =>
    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))
  const zoomIn = () =>
    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={loading || currentPage <= 1}
            className="rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="min-w-20 px-2 text-center tabular-nums">
            {pageCount ? `${currentPage} / ${pageCount}` : '— / —'}
          </span>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={loading || !pageCount || currentPage >= pageCount}
            className="rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={loading || zoom <= MIN_ZOOM}
            className="rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={loading || zoom === 1}
            className="min-w-14 rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 tabular-nums disabled:cursor-not-allowed disabled:opacity-40"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={loading || zoom >= MAX_ZOOM}
            className="rounded-md border border-gray-200 px-2 py-1 font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto p-4">
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
    const focusedIds = new Set(
      [activeChunkId, hoveredChunkId].filter((id): id is string => Boolean(id)),
    )

    for (const [pageStr, entries] of Object.entries(highlights)) {
      const pageNum = Number(pageStr)
      const wrapper = pageRefs.current.get(pageNum)
      if (!wrapper) continue

      // Remove old overlay layer
      const existing = wrapper.querySelector('[data-overlay-layer]')
      if (existing) existing.remove()
      if (!focusedIds.size) continue

      const visibleEntries = (entries as ChunkHighlightEntry[]).filter((entry) =>
        focusedIds.has(entry.chunkId),
      )
      if (!visibleEntries.length) continue

      const layer = document.createElement('div')
      layer.setAttribute('data-overlay-layer', '')
      layer.style.position = 'absolute'
      layer.style.inset = '0'
      layer.style.pointerEvents = 'none'

      for (const entry of visibleEntries) {
        const idx = chunkIndexById.get(entry.chunkId) ?? 0
        const color = colorFor(idx)
        const isHovered = hoveredChunkId === entry.chunkId
        const isActive = activeChunkId === entry.chunkId

        for (const rect of entry.rects) {
          const div = document.createElement('div')
          div.style.position = 'absolute'
          div.style.left = `${rect.left}px`
          div.style.top = `${rect.top}px`
          div.style.width = `${rect.width}px`
          div.style.height = `${rect.height}px`
          div.style.background = color.bg
          div.style.borderRadius = '2px'
          div.style.mixBlendMode = 'multiply'
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
