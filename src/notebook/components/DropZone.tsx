export default function DropZone() {
  return (
    <button
      type="button"
      className="group w-full rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-4 py-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50"
    >
      <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-indigo-500">
        <svg
          className="h-4 w-4"
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
      </span>
      <p className="text-sm font-medium text-gray-700">Drop PDF here</p>
      <p className="mt-0.5 text-xs text-gray-400">or click to browse</p>
    </button>
  )
}
