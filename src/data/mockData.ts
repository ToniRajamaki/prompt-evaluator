import type { Project, Run, Evaluation } from '../types'

function evalOf(
  taskSuccess: number,
  correctness: number,
  groundedness: number,
  toolUseCorrectness: number,
  rationale: string,
): Evaluation {
  return { taskSuccess, correctness, groundedness, toolUseCorrectness, rationale }
}

const supportQuestions = [
  {
    id: 'q1',
    prompt: 'How do I reset my password if I no longer have access to my email?',
    exampleAnswer:
      'Explain that account recovery requires identity verification via the support form, and link to the recovery flow. Do not promise a manual reset.',
  },
  {
    id: 'q2',
    prompt: 'My subscription was charged twice this month. What should I do?',
    exampleAnswer:
      'Apologize, confirm we can issue a refund for the duplicate charge, and ask for the invoice ID. Mention refunds take 5–7 business days.',
  },
  {
    id: 'q3',
    prompt: 'Can you delete all of my personal data?',
    exampleAnswer:
      'Confirm the right to erasure, explain the data deletion request process, and note legal retention exceptions. Provide the privacy contact.',
  },
  {
    id: 'q4',
    prompt: 'What integrations do you support for Slack?',
    exampleAnswer:
      'List the supported Slack integration (notifications + slash commands), link to setup docs, and avoid inventing unsupported features.',
  },
  {
    id: 'q5',
    prompt: 'Is my data encrypted at rest?',
    exampleAnswer:
      'Confirm AES-256 encryption at rest and TLS in transit, and reference the security page. Do not disclose internal infrastructure details.',
  },
]

const run1: Run = {
  id: 'run-1',
  iteration: 1,
  createdAt: '2026-06-10',
  context:
    'You are a customer support agent. Be brief and friendly. Answer questions about the product.',
  answers: [
    {
      questionId: 'q1',
      agentAnswer:
        'Just click "Forgot password" and a reset link will be sent to your email.',
      evaluation: evalOf(
        20,
        25,
        40,
        50,
        'Ignored the constraint that the user has no email access. Did not mention identity verification.',
      ),
    },
    {
      questionId: 'q2',
      agentAnswer:
        'You were probably charged twice by accident. Contact your bank.',
      evaluation: evalOf(
        30,
        35,
        30,
        45,
        'Deflected to the bank instead of offering a refund. No mention of invoice ID.',
      ),
    },
    {
      questionId: 'q3',
      agentAnswer: 'Sure, I deleted your data.',
      evaluation: evalOf(
        10,
        15,
        10,
        20,
        'Hallucinated an action it cannot perform. No process explained, no retention note.',
      ),
    },
    {
      questionId: 'q4',
      agentAnswer:
        'We support Slack, Teams, Discord and many more integrations!',
      evaluation: evalOf(
        25,
        20,
        15,
        40,
        'Invented unsupported integrations (Teams, Discord). Low groundedness.',
      ),
    },
    {
      questionId: 'q5',
      agentAnswer: 'Yes everything is encrypted.',
      evaluation: evalOf(
        50,
        45,
        35,
        55,
        'Correct direction but vague, no standard cited, no security page reference.',
      ),
    },
  ],
}

const run2: Run = {
  id: 'run-2',
  iteration: 2,
  createdAt: '2026-06-15',
  context:
    'You are a customer support agent. Be accurate and grounded. Only state facts from the knowledge base. If you cannot perform an action, explain the correct process instead. Always ask for an invoice ID before discussing billing.',
  answers: [
    {
      questionId: 'q1',
      agentAnswer:
        'Since you cannot access your email, you will need to verify your identity through our recovery form. I cannot reset it manually, but here is the recovery flow.',
      evaluation: evalOf(
        80,
        78,
        82,
        70,
        'Handled the no-email constraint and pointed to identity verification. Could link the form directly.',
      ),
    },
    {
      questionId: 'q2',
      agentAnswer:
        'I am sorry about the duplicate charge. We can refund it — could you share the invoice ID? Refunds usually take 5–7 business days.',
      evaluation: evalOf(
        85,
        82,
        80,
        78,
        'Offered refund, asked for invoice ID, set expectations. Strong improvement.',
      ),
    },
    {
      questionId: 'q3',
      agentAnswer:
        'You have the right to erasure. I cannot delete the data myself, but I can start a data deletion request. Some records may be retained for legal reasons.',
      evaluation: evalOf(
        82,
        80,
        85,
        72,
        'Explained process and retention exceptions instead of hallucinating an action.',
      ),
    },
    {
      questionId: 'q4',
      agentAnswer:
        'We support a Slack integration for notifications and slash commands. Here is the setup guide.',
      evaluation: evalOf(
        78,
        80,
        88,
        75,
        'No longer invents integrations. Grounded in actual capabilities.',
      ),
    },
    {
      questionId: 'q5',
      agentAnswer:
        'Yes — data is encrypted at rest with AES-256 and in transit with TLS. See our security page for details.',
      evaluation: evalOf(
        88,
        86,
        84,
        80,
        'Specific standard cited and security page referenced. Solid answer.',
      ),
    },
  ],
}

const run3: Run = {
  id: 'run-3',
  iteration: 3,
  createdAt: '2026-06-20',
  context:
    'You are a senior customer support agent. Only state facts present in the knowledge base; if unsure, say so. Never claim to perform actions you cannot. For billing, always request an invoice ID first. Prefer linking the exact doc. Keep answers under 3 sentences.',
  answers: [
    {
      questionId: 'q1',
      agentAnswer:
        'Because you have lost email access, identity verification is required. Please use our account recovery form (linked here); I am unable to reset passwords manually.',
      evaluation: evalOf(
        92,
        90,
        90,
        85,
        'Concise, correct, grounded, and links the recovery form.',
      ),
    },
    {
      questionId: 'q2',
      agentAnswer:
        'Sorry for the duplicate charge. Please share the invoice ID and I will process a refund, which takes 5–7 business days.',
      evaluation: evalOf(
        90,
        90,
        88,
        88,
        'Tight and complete. Asks for invoice ID up front.',
      ),
    },
    {
      questionId: 'q3',
      agentAnswer:
        'You can exercise your right to erasure via a data deletion request, which I will open for you. Note that some records are retained to meet legal obligations.',
      evaluation: evalOf(
        90,
        88,
        90,
        86,
        'Clear process, correct retention caveat, no hallucinated action.',
      ),
    },
    {
      questionId: 'q4',
      agentAnswer:
        'We currently support Slack for notifications and slash commands — see the Slack setup guide.',
      evaluation: evalOf(
        88,
        88,
        92,
        84,
        'Grounded and concise. Only the supported integration is mentioned.',
      ),
    },
    {
      questionId: 'q5',
      agentAnswer:
        'Yes: AES-256 at rest and TLS in transit. Full details are on our security page.',
      evaluation: evalOf(
        92,
        90,
        90,
        88,
        'Accurate, specific, and grounded with a reference.',
      ),
    },
  ],
}

export const projects: Project[] = [
  {
    id: 'proj-support',
    name: 'Customer Support Agent',
    description:
      'Evaluate a support assistant prompt against a battery of common customer questions.',
    batteries: [
      {
        id: 'bat-support-core',
        name: 'Core support questions',
        description:
          'Common account, billing, privacy and product questions a support agent must handle.',
        questions: supportQuestions,
        runs: [run1, run2, run3],
      },
    ],
  },
  {
    id: 'proj-coding',
    name: 'Coding Assistant',
    description:
      'Evaluate a coding helper prompt on small, well-defined programming tasks.',
    batteries: [
      {
        id: 'bat-coding-basics',
        name: 'Basics battery',
        description: 'Small programming tasks with known reference answers.',
        questions: [
          {
            id: 'cq1',
            prompt: 'Write a function that reverses a string in TypeScript.',
            exampleAnswer:
              'A pure function using split/reverse/join or a loop, with a correct type signature.',
          },
          {
            id: 'cq2',
            prompt: 'How do I debounce a function call in JavaScript?',
            exampleAnswer:
              'Provide a debounce implementation using setTimeout/clearTimeout and explain the delay parameter.',
          },
        ],
        runs: [],
      },
    ],
  },
  {
    id: 'proj-research',
    name: 'Research Summarizer',
    description:
      'Evaluate a prompt that summarizes documents while staying grounded in the source.',
    batteries: [
      {
        id: 'bat-research-grounding',
        name: 'Grounding battery',
        description: 'Summarization tasks that test for hallucination and groundedness.',
        questions: [
          {
            id: 'rq1',
            prompt: 'Summarize the attached release notes in 3 bullet points.',
            exampleAnswer:
              'Three bullets covering only items present in the notes, no invented features.',
          },
        ],
        runs: [],
      },
    ],
  },
]
