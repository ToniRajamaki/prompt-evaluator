interface ScoreBadgeProps {
  value: number
  label?: string
}

function colorFor(value: number): string {
  if (value >= 75) return 'bg-green-100 text-green-800 border-green-300'
  if (value >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  return 'bg-red-100 text-red-800 border-red-300'
}

export default function ScoreBadge({ value, label }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-mono ${colorFor(
        value,
      )}`}
    >
      {label && <span className="text-gray-500">{label}</span>}
      <span>{value}</span>
    </span>
  )
}
