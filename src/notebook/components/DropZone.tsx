export default function DropZone() {
  return (
    <button
      type="button"
      className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-3 py-2.5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 transition group-hover:text-indigo-500">
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
      </span>
      <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-600">
        Drop PDF or click to browse
      </span>
    </button>
  )
}
