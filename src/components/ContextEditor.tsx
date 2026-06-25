interface ContextEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function ContextEditor({ value, onChange }: ContextEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Agent context (system prompt)
      </label>
      <p className="text-xs text-gray-500 mb-2">
        Everything the agent sees before answering. Edit this between iterations to
        improve performance.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full border border-gray-300 rounded p-3 font-mono text-sm focus:outline-none focus:border-gray-500"
        placeholder="You are a helpful assistant..."
      />
    </div>
  )
}
