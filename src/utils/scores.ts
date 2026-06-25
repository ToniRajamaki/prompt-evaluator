import type { Run, CriterionKey } from '../types'
import { CRITERIA } from '../types'

export function answerOverall(e: {
  taskSuccess: number
  correctness: number
  groundedness: number
  toolUseCorrectness: number
}): number {
  return Math.round(
    (e.taskSuccess + e.correctness + e.groundedness + e.toolUseCorrectness) / 4,
  )
}

export function criterionAverage(run: Run, key: CriterionKey): number {
  if (run.answers.length === 0) return 0
  const sum = run.answers.reduce((acc, a) => acc + a.evaluation[key], 0)
  return Math.round(sum / run.answers.length)
}

export function runOverall(run: Run): number {
  if (run.answers.length === 0) return 0
  const sum = CRITERIA.reduce((acc, c) => acc + criterionAverage(run, c.key), 0)
  return Math.round(sum / CRITERIA.length)
}
