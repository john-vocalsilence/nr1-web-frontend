import type {
  IQuestionnaireAnswer,
  IQuestionnaire,
  ILlmMessage,
  IQuestionnaireQuestion,
  IFollowUpResponse,
} from '@/lib/interfaces/nr1.interfaces'
import questionnaire from './questionnaire.json'
import followup from './followup.json'
import type { IChatMessage, IQuestionMessage, ITextMessage } from '@/lib/interfaces/chat.interfaces'

// Keep a pristine copy of the JSON and normalize per access
const baseQn = questionnaire as unknown as IQuestionnaire
const baseFollowUp = followup as unknown as IQuestionnaire

const activeQuestionnaires = new Map<string, IQuestionnaire>()
const followUpServed = new Set<string>()

function normalizeOptions(options: string[] | string): string[] {
  if (Array.isArray(options)) return options
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {}
    return options
      .split(/\r?\n|\|/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeQuestionnaire(src: IQuestionnaire): IQuestionnaire {
  // Shallow clone and normalize each question with safe defaults
  const qn: IQuestionnaire = {
    ...src,
    questions: (src.questions || []).map((q, idx) => ({
      ...q,
      // fallbacks to keep types satisfied if JSON is sparse
      id: q.id ?? idx + 1,
      question: q.question ?? `Question ${idx + 1}`,
      type: (q.type as any) ?? 'radio',
      required: typeof q.required === 'boolean' ? q.required : true,
      html: q.html ?? '',
      dimension: q.dimension ?? '',
      options: normalizeOptions(q.options ?? []),
    })),
  }
  return qn
}

export function getMockQuestionnaire(qnId: string): IQuestionnaire {
  const qn = normalizeQuestionnaire(baseQn)
  activeQuestionnaires.set(qnId, qn)
  followUpServed.delete(qnId)
  resetProgress(qnId)
  return qn
}

function getMockFollowUpQuestionnaire(): IQuestionnaire {
  return normalizeQuestionnaire(baseFollowUp)
}

// Track progress per questionnaire id using a simple counter
const progressMap = new Map<string, number>()

function getProgress(qnId: string) {
  return progressMap.get(qnId) ?? 0
}
function setProgress(qnId: string, value: number) {
  progressMap.set(qnId, value)
}
export function resetProgress(qnId?: string) {
  if (qnId) progressMap.delete(qnId)
  else progressMap.clear()
}

export function requestFollowUp(qnId: string, answers: IQuestionnaireAnswer[]): IFollowUpResponse {
  if (!answers?.length) {
    return { message: 'Não há questionário de acompanhamento.' }
  }

  if (followUpServed.has(qnId)) {
    return { message: 'Não há questionário de acompanhamento.' }
  }

  const shouldSendFollowUp = answers.length >= 5
  if (!shouldSendFollowUp) {
    followUpServed.add(qnId)
    return { message: 'Não há questionário de acompanhamento.' }
  }

  followUpServed.add(qnId)
  const followUpQn = getMockFollowUpQuestionnaire()
  activeQuestionnaires.set(qnId, followUpQn)
  resetProgress(qnId)

  return { questionnaire: followUpQn }
}

function getNextQuestionByCounter(qnId: string): IQuestionnaireQuestion | null {
  const qn = activeQuestionnaires.get(qnId) ?? getMockQuestionnaire(qnId)
  const idx = getProgress(qnId)
  if (idx >= qn.questions.length) return null
  return qn.questions[idx]
}

// Simulate an LLM that serves the next question based on a global counter
export async function mockLlmResponse(
  qnId: string,
  payload: { message: IChatMessage | string }
): Promise<ILlmMessage> {
  // Log the payload for visibility during development
  // eslint-disable-next-line no-console
  // console.log('[userMessage]', { qnId, payload })
  // console.log('[llmMessage]', 'computing response...')

  // simulate latency
  await new Promise((res) => setTimeout(res, 250))

  const next = getNextQuestionByCounter(qnId)
  if (!next) {
    const doneMsg: ITextMessage = {
      schema: 'text',
      role: 'assistant',
      msgId: `done-${Date.now()}`,
      content: 'Thanks for completing the questionnaire. Your responses have been recorded.',
      timestamp: new Date().toISOString(),
    }
    return { message: doneMsg }
  }

  // advance the counter for next call
  setProgress(qnId, getProgress(qnId) + 1)

  const msg: IQuestionMessage = {
    msgId: `qmsg-${Date.now()}`,
    schema: 'question',
    role: 'assistant',
    qId: next.id,
    content: next.question,
    type: next.type,
    options: normalizeOptions(next.options),
    timestamp: new Date().toISOString(),
  }

  return { message: msg }
}
