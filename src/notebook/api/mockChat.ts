import type { AnswerParagraph, ChunkSet, Citation } from '../types'

/**
 * Faked, source-grounded chat. No backend — this generates a plausible-looking
 * answer whose paragraphs each cite a random chunk from the loaded document so
 * the citation/highlight UX can be exercised end to end.
 */

const OPENERS = [
  'Based on the document, ',
  'According to the source material, ',
  'The relevant passage indicates that ',
  'From what the source describes, ',
  'As outlined in the document, ',
]

const CONNECTORS = [
  'This is further supported where the text notes the specific obligations involved.',
  'The same section clarifies how this applies in practice.',
  'It also spells out the consequences when the conditions are not met.',
  'The wording leaves little room for ambiguity on this point.',
  'This detail is worth keeping in mind for the overall picture.',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function snippetOf(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

function citationFor(chunkSet: ChunkSet, chunk: ChunkSet['chunks'][number]): Citation {
  return {
    id: crypto.randomUUID(),
    fileName: chunkSet.source,
    page: chunk.page ?? chunkSet.page,
    chunkId: chunk.id,
    snippet: snippetOf(chunk.text),
  }
}

function buildParagraph(
  question: string,
  index: number,
  chunkSet: ChunkSet | null,
): AnswerParagraph {
  const id = crypto.randomUUID()
  const citations: Citation[] = []

  let text: string
  if (chunkSet && chunkSet.chunks.length) {
    const chunk = pickRandom(chunkSet.chunks)
    citations.push(citationFor(chunkSet, chunk))
    const lead = index === 0 ? pickRandom(OPENERS) : ''
    text = `${lead}${snippetOf(chunk.text, 160)} ${pickRandom(CONNECTORS)}`
  } else {
    text =
      index === 0
        ? `Here's what I found about "${question}". Load a document with chunks to see precise source citations.`
        : pickRandom(CONNECTORS)
  }

  return { id, text, citations }
}

export function generateMockAnswer(
  question: string,
  chunkSet: ChunkSet | null,
): { paragraphs: AnswerParagraph[]; text: string } {
  const count = 2 + Math.floor(Math.random() * 3) // 2-4 paragraphs
  const paragraphs = Array.from({ length: count }, (_, i) =>
    buildParagraph(question, i, chunkSet),
  )

  // If we have enough chunks, make the cited chunks distinct for a nicer demo.
  if (chunkSet && chunkSet.chunks.length >= count) {
    const picks = shuffle(chunkSet.chunks).slice(0, count)
    paragraphs.forEach((p, i) => {
      const chunk = picks[i]
      p.citations = [
        citationFor(chunkSet, chunk),
      ]
      const lead = i === 0 ? pickRandom(OPENERS) : ''
      p.text = `${lead}${snippetOf(chunk.text, 160)} ${pickRandom(CONNECTORS)}`
    })
  }

  const text = paragraphs.map((p) => p.text).join('\n\n')
  return { paragraphs, text }
}

export async function sendMockChat(
  question: string,
  chunkSet: ChunkSet | null,
  signal?: AbortSignal,
): Promise<{ paragraphs: AnswerParagraph[]; text: string }> {
  const delay = 600 + Math.random() * 600
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delay)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
  return generateMockAnswer(question, chunkSet)
}
