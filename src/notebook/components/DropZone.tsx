import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

interface DropZoneProps {
  onUpload?: (file: File) => void | Promise<void>
  disabled?: boolean
}

const ACCEPT = '.pdf,.md,.txt'

export default function DropZone({ onUpload, disabled }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const label = busy ? 'Uploading…' : disabled ? 'Offline' : 'Upload'
  const tooltip = disabled
    ? 'Backend offline — uploads disabled'
    : 'Drop PDF, Markdown, or TXT files here, or click to browse.'

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpload) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        await onUpload(file)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || busy}
        title={tooltip}
        aria-label={tooltip}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-center transition disabled:opacity-60 ${
          dragOver
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-300 bg-gray-50/50 hover:border-amber-400 hover:bg-amber-50/50'
        }`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-amber-500">
          {busy ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M5 11l7-7 7 7" />
              <path d="M5 20h14" />
            </svg>
          )}
        </span>
        <span className="text-xs font-medium text-gray-600 group-hover:text-amber-600">
          {label}
        </span>
      </button>
    </>
  )
}
