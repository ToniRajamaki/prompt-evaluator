import type { Battery } from '../types'
import QuestionCard from './QuestionCard'
import IterationHistory from './IterationHistory'

interface BatteryViewProps {
  battery: Battery
  onNewRun: () => void
  onOpenRun: (runId: string) => void
}

export default function BatteryView({ battery, onNewRun, onOpenRun }: BatteryViewProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold">{battery.name}</h2>
        <button
          type="button"
          onClick={onNewRun}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
        >
          + New run
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">{battery.description}</p>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Iteration history
      </h3>
      <div className="mb-8">
        <IterationHistory runs={battery.runs} onOpenRun={onOpenRun} />
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Questions ({battery.questions.length})
      </h3>
      <div className="space-y-3">
        {battery.questions.map((q, i) => (
          <QuestionCard key={q.id} index={i + 1} question={q} />
        ))}
      </div>
    </div>
  )
}
