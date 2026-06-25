import type { Project } from '../types'
import { runOverall } from '../utils/scores'
import ScoreBadge from './ScoreBadge'

interface ProjectViewProps {
  project: Project
  onOpenBattery: (batteryId: string) => void
}

export default function ProjectView({ project, onOpenBattery }: ProjectViewProps) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-1">{project.name}</h2>
      <p className="text-sm text-gray-500 mb-4">{project.description}</p>

      <h3 className="text-sm font-semibold text-gray-700 mb-2">Question batteries</h3>
      <ul className="space-y-3">
        {project.batteries.map((b) => {
          const lastRun = b.runs[b.runs.length - 1]
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onOpenBattery(b.id)}
                className="w-full text-left border border-gray-300 rounded p-4 bg-white hover:border-gray-500"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{b.name}</span>
                  {lastRun ? (
                    <ScoreBadge value={runOverall(lastRun)} label={`iter ${lastRun.iteration}`} />
                  ) : (
                    <span className="text-xs text-gray-400">no runs yet</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{b.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {b.questions.length} questions · {b.runs.length} run
                  {b.runs.length === 1 ? '' : 's'}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
