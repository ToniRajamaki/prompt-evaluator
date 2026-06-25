export type CriterionKey =
  | 'taskSuccess'
  | 'correctness'
  | 'groundedness'
  | 'toolUseCorrectness'

export const CRITERIA: { key: CriterionKey; label: string }[] = [
  { key: 'taskSuccess', label: 'Task success' },
  { key: 'correctness', label: 'Correctness' },
  { key: 'groundedness', label: 'Groundedness' },
  { key: 'toolUseCorrectness', label: 'Tool-use correctness' },
]

export interface Evaluation {
  taskSuccess: number
  correctness: number
  groundedness: number
  toolUseCorrectness: number
  rationale: string
}

export interface Answer {
  questionId: string
  agentAnswer: string
  evaluation: Evaluation
}

export interface Run {
  id: string
  iteration: number
  context: string
  createdAt: string
  answers: Answer[]
}

export interface Question {
  id: string
  prompt: string
  exampleAnswer: string
}

export interface Battery {
  id: string
  name: string
  description: string
  questions: Question[]
  runs: Run[]
}

export interface Project {
  id: string
  name: string
  description: string
  batteries: Battery[]
}
