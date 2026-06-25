import type { PdfSource } from '../types'

interface SourceItemProps {
  source: PdfSource
}

export default function SourceItem({ source }: SourceItemProps) {
  return (
    <label className="flex items-start gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm">
      <input
        type="checkbox"
        defaultChecked={source.selected}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block truncate font-medium text-gray-800">
          {source.name}
        </span>
        <span className="text-xs text-gray-400">{source.pages} pages</span>
      </span>
    </label>
  )
}
