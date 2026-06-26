import type { Citation } from '../types'

interface CitationPillProps {
  citation: Citation
  onClick?: (citation: Citation) => void
}

export default function CitationPill({ citation, onClick }: CitationPillProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      title={citation.snippet}
      className="group inline-flex max-w-full items-center gap-1 rounded-md border border-yellow-300 bg-yellow-100 px-1.5 py-0.5 align-middle text-[11px] font-medium text-yellow-900 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-200 active:scale-95"
    >
      <svg
        className="h-3 w-3 shrink-0 text-yellow-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="truncate">{citation.fileName}</span>
      <span className="shrink-0 text-yellow-600">· p.{citation.page}</span>
    </button>
  )
}
