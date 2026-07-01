import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import 'pdfjs-dist/web/pdf_viewer.css'
import './pdfSelection.css'
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlights, setHighlights] = useState<ChunkRectsByPage>({})

  const chunkIndexById = useMemo(() => {
    const m = new Map<string, number>()
    chunks?.forEach((c, i) => m.set(c.id, i))
    return m
  }, [chunks])

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

    const renderedPages = new Set<number>()
    const renderingPages = new Set<number>()
    const textLayers = new Map<number, pdfjsLib.TextLayer>()
    let cleanupScroll: (() => void) | null = null

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then(async (pdf) => {
        const viewports: Record<number, pdfjsLib.PageViewport> = {}

        // Build correctly-sized placeholders for every page. getPage/getViewport
        // is cheap (no rasterization), so this keeps scroll height accurate.
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
            canvas.style.userSelect = 'none'
            canvas.style.pointerEvents = 'none'
            ctx.scale(dpr, dpr)

            // Insert behind any highlight overlay layer.
            wrapper.insertBefore(canvas, wrapper.firstChild)
            await page.render({ canvasContext: ctx, viewport, canvas }).promise
            if (cancelled) return

            const textLayerContainer = document.createElement('div')
            textLayerContainer.className = 'textLayer sourcechat-pdf-text-layer'
            textLayerContainer.setAttribute('data-page-text-layer', '')
            textLayerContainer.style.position = 'absolute'
            textLayerContainer.style.inset = '0'
            textLayerContainer.style.zIndex = '3'
            textLayerContainer.style.pointerEvents = 'auto'
            textLayerContainer.style.setProperty('--scale-factor', String(SCALE))
            textLayerContainer.style.setProperty('--total-scale-factor', String(SCALE))
            wrapper.appendChild(textLayerContainer)

            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: await page.getTextContent(),
              container: textLayerContainer,
              viewport,
            })
            textLayers.set(pageNum, textLayer)
            await textLayer.render()
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
          textLayers.get(pageNum)?.cancel()
          textLayers.delete(pageNum)
          const c = wrapper.querySelector('[data-page-canvas]')
          if (c) c.remove()
          const textLayer = wrapper.querySelector('[data-page-text-layer]')
          if (textLayer) textLayer.remove()
          renderedPages.delete(pageNum)
        }

        // Deterministic virtualization driven by scroll position: rasterize the
        // pages whose wrappers fall within the viewport (plus a margin) and free
        // the rest so we never hold more than a handful of canvases at once.
        const MARGIN = 1500
        const updateVisible = () => {
          if (cancelled) return
          const top = scroll.scrollTop
          const bottom = top + scroll.clientHeight
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
      for (const textLayer of textLayers.values()) textLayer.cancel()
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
      layer.style.zIndex = '2'
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
          div.style.pointerEvents = 'none'
          if (isActive) {
            div.style.boxShadow = `0 0 0 2px ${color.ring}`
          }
          if (isHovered) {
            div.style.boxShadow = `0 0 0 2px ${color.ring}, 0 2px 6px rgba(0,0,0,0.15)`
            div.style.filter = 'brightness(1.05)'
          }
          div.title = `Chunk ${idx + 1}`
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
