import type { Run } from '../types'
import { CRITERIA } from '../types'
import { criterionAverage, runOverall } from '../utils/scores'
import ScoreBadge from './ScoreBadge'

interface IterationHistoryProps {
  runs: Run[]
  onOpenRun?: (runId: string) => void
}

export default function IterationHistory({ runs, onOpenRun }: IterationHistoryProps) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No runs yet. Start a run to see how the prompt performs.
      </p>
    )
  }

  const ordered = [...runs].sort((a, b) => a.iteration - b.iteration)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-3 py-2 font-medium">Iteration</th>
            <th className="px-3 py-2 font-medium">Date</th>
            {CRITERIA.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Overall</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {ordered.map((run) => (
            <tr key={run.id} className="border-t border-gray-200">
              <td className="px-3 py-2 font-mono">#{run.iteration}</td>
              <td className="px-3 py-2 text-gray-500">{run.createdAt}</td>
              {CRITERIA.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  <ScoreBadge value={criterionAverage(run, c.key)} />
                </td>
              ))}
              <td className="px-3 py-2">
                <ScoreBadge value={runOverall(run)} />
              </td>
              <td className="px-3 py-2 text-right">
                {onOpenRun && (
                  <button
                    type="button"
                    onClick={() => onOpenRun(run.id)}
                    className="text-gray-700 hover:underline text-xs"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
