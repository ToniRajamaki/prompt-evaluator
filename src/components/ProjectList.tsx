import type { Project } from '../types'

interface ProjectListProps {
  projects: Project[]
  onOpen: (projectId: string) => void
}

export default function ProjectList({ projects, onOpen }: ProjectListProps) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-1">Projects</h2>
      <p className="text-sm text-gray-500 mb-4">
        Each project evaluates one prompt against its question batteries.
      </p>

      <ul className="space-y-3">
        {projects.map((p) => {
          const batteryCount = p.batteries.length
          const runCount = p.batteries.reduce((acc, b) => acc + b.runs.length, 0)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="w-full text-left border border-gray-300 rounded p-4 bg-white hover:border-gray-500"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-gray-500">
                    {batteryCount} batter{batteryCount === 1 ? 'y' : 'ies'} · {runCount} run
                    {runCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{p.description}</p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
