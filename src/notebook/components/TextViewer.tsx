import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface TextViewerProps {
  url: string
  mode: 'md' | 'txt'
}

export default function TextViewer({ url, mode }: TextViewerProps) {
  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="h-full overflow-y-auto bg-white p-6">
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {!loading && !error && mode === 'md' && (
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      )}
      {!loading && !error && mode === 'txt' && (
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
          {content}
        </pre>
      )}
    </div>
  )
}
