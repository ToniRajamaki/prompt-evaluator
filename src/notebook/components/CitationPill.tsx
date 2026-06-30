import type { Citation } from '../types'

interface CitationPillProps {
  citation: Citation
  onClick?: (citation: Citation) => void
  variant?: 'chip' | 'inline'
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getDisplayName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

function FileIcon({ extension }: { extension: string }) {
  if (extension === 'pdf') {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-rose-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v5" />
        <path d="M14 12v5" />
        <path d="M14 12h1.5a1.5 1.5 0 0 1 0 3H14" />
      </svg>
    )
  }

  if (extension === 'md') {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-sky-600"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M4 5.5A2.5 2.5 0 0 0 1.5 8v8A2.5 2.5 0 0 0 4 18.5h16a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 20 5.5H4Zm1.75 9.25v-5.5h1.7l1.55 2.2 1.55-2.2h1.7v5.5h-1.5v-3.2L9 14.05l-1.75-2.5v3.2h-1.5Zm10.5 0-2.5-2.75h1.55V9.25h1.9V12h1.55l-2.5 2.75Z" />
      </svg>
    )
  }

  return (
    <svg
      className="h-4 w-4 shrink-0 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  )
}

export default function CitationPill({
  citation,
  onClick,
  variant = 'chip',
}: CitationPillProps) {
  const displayName = getDisplayName(citation.fileName)
  const pageLabel = `p. ${citation.page}`
  const title = `${citation.fileName}, ${pageLabel}: ${citation.snippet}`

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => onClick?.(citation)}
        title={title}
        className="mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-0.5 align-baseline text-xs font-medium text-gray-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 active:scale-[0.98]"
      >
        <FileIcon extension={getFileExtension(citation.fileName)} />
        <span className="truncate">{displayName}</span>
        <span className="shrink-0 text-[11px] text-gray-500">{pageLabel}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 active:scale-[0.98]"
    >
      <FileIcon extension={getFileExtension(citation.fileName)} />
      <span className="truncate">{displayName}</span>
      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
        {pageLabel}
      </span>
    </button>
  )
}
