import { useEffect, useState } from 'react'
import type { DocumentEntry } from '../hooks/useDocuments'
import { getDocument } from '../api/documents'

interface FileInfoPanelProps {
  entry: DocumentEntry
  onClose: () => void
}

const statusStyles: Record<string, string> = {
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  processing: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  error: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-right text-xs text-gray-800">{value}</span>
    </div>
  )
}

/**
 * Modal showing a document's metadata: kind, pages, chunk count, how many
 * chunks are vectorized, embedding model, and ingestion status. Backend-backed
 * documents are re-fetched for fresh detail; static demo files show what we know.
 */
export default function FileInfoPanel({ entry, onClose }: FileInfoPanelProps) {
  const [detail, setDetail] = useState<DocumentEntry>(entry)

  useEffect(() => {
    setDetail(entry)
    if (entry.backed !== 'backend') return
    let cancelled = false
    getDocument(entry.id)
      .then((doc) => {
        if (!cancelled) setDetail({ ...entry, ...doc })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [entry])

  const vectorized =
    detail.chunkCount > 0 && detail.vectorizedCount >= detail.chunkCount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900" title={detail.name}>
              {detail.name}
            </h2>
            <p className="text-xs text-gray-400">Document details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          <Row
            label="Status"
            value={
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase ring-1 ring-inset ${
                  statusStyles[detail.status] ?? statusStyles.ready
                }`}
              >
                {detail.status}
              </span>
            }
          />
          <Row label="Type" value={detail.kind.toUpperCase()} />
          {detail.kind === 'pdf' && (
            <Row label="Pages" value={detail.pageCount || '—'} />
          )}
          <Row label="Chunks" value={detail.chunkCount || (detail.backed === 'static' ? 'computed in browser' : 0)} />
          <Row
            label="Vectorized"
            value={
              detail.backed === 'static' ? (
                'n/a (demo file)'
              ) : (
                <span className={vectorized ? 'text-emerald-700' : 'text-amber-700'}>
                  {detail.vectorizedCount}/{detail.chunkCount} {vectorized ? '✓' : ''}
                </span>
              )
            }
          />
          {detail.backed === 'backend' && (
            <Row label="Embedding model" value={detail.embeddingModel ?? '—'} />
          )}
          <Row
            label="Storage"
            value={detail.backed === 'backend' ? 'Postgres + pgvector' : 'Bundled demo file'}
          />
          {detail.error && (
            <Row label="Error" value={<span className="text-rose-600">{detail.error}</span>} />
          )}
        </div>
      </div>
    </div>
  )
}
