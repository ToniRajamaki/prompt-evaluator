import { useState } from 'react'
import type { Battery, Run, Answer } from '../types'
import ContextEditor from './ContextEditor'
import ResultsReport from './ResultsReport'

interface RunViewProps {
  battery: Battery
}

function buildMockRun(battery: Battery, context: string): Run {
  const template = battery.runs[battery.runs.length - 1]
  const answers: Answer[] = battery.questions.map((q) => {
    const prev = template?.answers.find((a) => a.questionId === q.id)
    if (prev) {
      return { ...prev, questionId: q.id }
    }
    return {
      questionId: q.id,
      agentAnswer: '(mock) The agent would answer this question here.',
      evaluation: {
        taskSuccess: 60,
        correctness: 60,
        groundedness: 60,
        toolUseCorrectness: 60,
        rationale: 'Mock evaluation — no reference run available yet.',
      },
    }
  })

  return {
    id: `run-${Date.now()}`,
    iteration: (template?.iteration ?? 0) + 1,
    createdAt: new Date().toISOString().slice(0, 10),
    context,
    answers,
  }
}

export default function RunView({ battery }: RunViewProps) {
  const seed = battery.runs[battery.runs.length - 1]?.context ?? ''
  const [context, setContext] = useState(seed)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<Run | null>(null)

  function startRun() {
    setPhase('running')
    setProgress(0)
    const total = battery.questions.length
    let i = 0
    const tick = () => {
      i += 1
      setProgress(i)
      if (i >= total) {
        setResult(buildMockRun(battery, context))
        setPhase('done')
        return
      }
      setTimeout(tick, 350)
    }
    setTimeout(tick, 350)
  }

  if (phase === 'done' && result) {
    return (
      <div>
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Run complete — evaluator scored {result.answers.length} answers.
        </div>
        <ResultsReport run={result} questions={battery.questions} />
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="mt-4 text-sm text-gray-700 hover:underline"
        >
          ← Configure another run
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-1">New run · {battery.name}</h2>
      <p className="text-sm text-gray-500 mb-4">
        Set the agent context, then run the {battery.questions.length}-question battery.
        The evaluator agent scores each answer.
      </p>

      <ContextEditor value={context} onChange={setContext} />

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={startRun}
          disabled={phase === 'running'}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {phase === 'running' ? 'Running…' : 'Run evaluation'}
        </button>
        {phase === 'running' && (
          <span className="text-sm text-gray-500">
            Answering question {progress} / {battery.questions.length}…
          </span>
        )}
      </div>
    </div>
  )
}
