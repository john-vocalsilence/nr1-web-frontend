import { followUpApiUrl, nr1Url } from '@/lib/constants';
import type { IChatMessage, ILlmMessage, IQuestionnaire, IQuestionnaireAnswer } from '@/lib/interfaces'

// Local iterator state per questionnaire id
const iterState = new Map<string, { qn?: IQuestionnaire; idx: number }>()

function getState(id: string) {
  const s = iterState.get(id) ?? { qn: undefined, idx: 0 }
  if (!iterState.has(id)) iterState.set(id, s)
  return s
}

function normalizeOptions(options: string[] | string | undefined): string[] {
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

export async function getQuestionnaire(qnId: string): Promise<IQuestionnaire> {
  const base = nr1Url || process.env.NEXT_NR1_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/nr1-questionnaires/${encodeURIComponent(qnId)}`
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch questionnaire: ${res.status}`)
  const qn = (await res.json()) as IQuestionnaire

  // normalize options if string-encoded in backend
  qn.questions = (qn.questions || []).map((q, idx) => ({
    ...q,
    id: q.id ?? idx + 1,
    options: normalizeOptions(q.options as any),
  }))

  const st = getState(qnId)
  st.qn = qn
  st.idx = 0
  return qn
}

export async function getNextQuestion(qnId: string, payload: { message: IChatMessage | string }): Promise<ILlmMessage> {
  // purely local progression over the already-fetched questionnaire
  const st = getState(qnId)
  if (!st.qn) throw new Error('Questionnaire not loaded')

  // If message is from user for a previous question, we just advance the index
  const idx = st.idx
  if (idx >= st.qn.questions.length) {
    return {
      message: {
        schema: 'text',
        role: 'assistant',
        msgId: `done-${Date.now()}`,
        content: 'Obrigado por completar o questionário.',
        timestamp: new Date().toISOString(),
      },
    }
  }

  const q = st.qn.questions[idx]
  st.idx = idx + 1
  return {
    message: {
      msgId: `qmsg-${Date.now()}`,
      schema: 'question',
      role: 'assistant',
      qId: q.id,
      content: q.question,
      type: q.type as any,
      options: normalizeOptions(q.options as any),
      timestamp: new Date().toISOString(),
    },
  }
}

export async function submitAnswers(qnId: string, answers: IQuestionnaireAnswer[]) {
  const base = nr1Url || process.env.NEXT_NR1_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/nr1-questionnaires/${encodeURIComponent(qnId)}/`
  console.log('[submitAnswers]', { qnId, answers })
  console.log(answers.map(a => typeof a.id))

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) throw new Error(`Failed to submit answers: ${res.status}`)
  return await res.json()
}

export async function requestFollowUpQuestionnaire(qnId: string, answers: IQuestionnaireAnswer[]) {
  const base = followUpApiUrl || process.env.NEXT_FOLLOW_UP_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/assessment`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionnaire_id: qnId, answers }),
  })
  if (!res.ok) throw new Error(`Failed to request follow-up: ${res.status}`)
  const data = await res.json()

  // If a questionnaire is returned, prep local iterator for the same qId
  if (data && data.questionnaire) {
    const qn = data.questionnaire as IQuestionnaire
    qn.questions = (qn.questions || []).map((q, idx) => ({
      ...q,
      id: q.id ?? idx + 1,
      options: normalizeOptions(q.options as any),
    }))
    const st = getState(qnId)
    st.qn = qn
    st.idx = 0
  }

  return data
}

