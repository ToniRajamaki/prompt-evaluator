import type { Question, Answer } from '../types'
import { CRITERIA } from '../types'
import { answerOverall } from '../utils/scores'
import ScoreBadge from './ScoreBadge'

interface QuestionCardProps {
  index: number
  question: Question
  answer?: Answer
}

export default function QuestionCard({ index, question, answer }: QuestionCardProps) {
  return (
    <div className="border border-gray-300 rounded p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-gray-900">
          {index}. {question.prompt}
        </h3>
        {answer && (
          <ScoreBadge value={answerOverall(answer.evaluation)} label="avg" />
        )}
      </div>

      <div className="mt-3 text-sm">
        <p className="text-gray-500 uppercase text-xs tracking-wide">Example answer</p>
        <p className="text-gray-700 mt-1">{question.exampleAnswer}</p>
      </div>

      {answer && (
        <div className="mt-4 border-t border-gray-200 pt-3 text-sm">
          <p className="text-gray-500 uppercase text-xs tracking-wide">Agent answer</p>
          <p className="text-gray-800 mt-1">{answer.agentAnswer}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {CRITERIA.map((c) => (
              <ScoreBadge
                key={c.key}
                value={answer.evaluation[c.key]}
                label={c.label}
              />
            ))}
          </div>

          <p className="mt-3 text-gray-600 italic">
            “{answer.evaluation.rationale}”
          </p>
        </div>
      )}
    </div>
  )
}
