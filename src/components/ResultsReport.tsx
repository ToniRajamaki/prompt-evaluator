import type { Run, Question } from '../types'
import { CRITERIA } from '../types'
import { criterionAverage, runOverall } from '../utils/scores'
import ScoreBadge from './ScoreBadge'
import QuestionCard from './QuestionCard'

interface ResultsReportProps {
  run: Run
  questions: Question[]
}

export default function ResultsReport({ run, questions }: ResultsReportProps) {
  const questionById = (id: string) => questions.find((q) => q.id === id)

  return (
    <div>
      <div className="border border-gray-300 rounded p-4 bg-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Iteration #{run.iteration} report
            </p>
            <p className="text-xs text-gray-500">{run.createdAt}</p>
          </div>
          <ScoreBadge value={runOverall(run)} label="overall" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CRITERIA.map((c) => (
            <ScoreBadge
              key={c.key}
              value={criterionAverage(run, c.key)}
              label={c.label}
            />
          ))}
        </div>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-gray-600">Context used</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
            {run.context}
          </pre>
        </details>
      </div>

      <div className="space-y-3">
        {run.answers.map((a, i) => {
          const q = questionById(a.questionId)
          if (!q) return null
          return <QuestionCard key={a.questionId} index={i + 1} question={q} answer={a} />
        })}
      </div>
    </div>
  )
}
