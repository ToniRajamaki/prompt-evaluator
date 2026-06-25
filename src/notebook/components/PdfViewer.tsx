import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

interface PdfViewerProps {
  url: string
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    setError(null)
    setLoading(true)

    const loadingTask = pdfjsLib.getDocument({ url })

    loadingTask.promise
      .then(async (pdf) => {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.25 })

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          const dpr = window.devicePixelRatio || 1
          canvas.width = viewport.width * dpr
          canvas.height = viewport.height * dpr
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          canvas.className = 'mx-auto mb-4 shadow border border-gray-200 bg-white'

          ctx.scale(dpr, dpr)

          container.appendChild(canvas)
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
        }
        if (!cancelled) setLoading(false)
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
  }, [url])

  return (
    <div className="h-full overflow-y-auto bg-gray-100 p-4">
      {loading && <p className="text-sm text-gray-500">Loading PDF…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      <div ref={containerRef} />
    </div>
  )
}
