import { followUpApiUrl, nr1Url } from '@/lib/constants';
import type { ILlmMessage, IQuestionnaire, IQuestionnaireAnswer, IQuestionnaireQuestion } from '@/lib/interfaces'
import { useNr1Store } from '@/lib/store';


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

export async function getNr1Questionnaire(qnId: string): Promise<IQuestionnaire> {
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
  return qn
}

export async function getFollowUpQuestionnaire(qnId: string, questions: IQuestionnaireQuestion[], answers: IQuestionnaireAnswer[]): Promise<IQuestionnaire> {
  const base = followUpApiUrl || process.env.NEXT_FOLLOW_UP_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionnaire_id: qnId, questions, answers }),
  })
  if (!res.ok) throw new Error(`Failed to request follow-up: ${res.status}`)
  const qn = (await res.json()) as IQuestionnaire
  qn.questions = (qn.questions || []).map((q, idx) => ({
    ...q,
    id: q.id ?? idx + 1,
    options: normalizeOptions(q.options as any),
  }))
  return qn
}

export async function getNextQuestion(): Promise<ILlmMessage> {
  // Grab Zustand state and actions
  const { questionnaire, currentQuestionId } = useNr1Store.getState()

  if (!questionnaire) {
    return {
      message: {
        schema: 'internal',
        role: 'system',
        code: 'error_no_questionnaire', 
      }
    }
  }

  const questions = questionnaire.questions
  if (!questions?.length) {
    return {
      message: {
        schema: 'internal',
        role: 'system',
        code: 'error_no_questions', 
      }
    }
  }

  // Determine next question index
  const currentIndex = currentQuestionId
    ? questions.findIndex((q) => q.id === currentQuestionId)
    : -1

  const nextIndex = currentIndex + 1

  // If finished, return closing message
  if (nextIndex >= questions.length) {
    return {
      message: {
        schema: 'internal',
        role: 'system',
        code: 'event_no_next_question',
      },
    }
  }

  const nextQuestion = questions[nextIndex]

  return {
    message: {
      msgId: `qmsg-${Date.now()}`,
      schema: 'question',
      role: 'assistant',
      qId: nextQuestion.id,
      content: nextQuestion.question,
      type: nextQuestion.type as any,
      options: normalizeOptions(nextQuestion.options),
      timestamp: new Date().toISOString(),
    },
  }
}

export async function submitNr1Answers(qnId: string, answers: IQuestionnaireAnswer[]) {
  const base = nr1Url || process.env.NEXT_NR1_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/nr1-questionnaires/${encodeURIComponent(qnId)}/`
  // console.log('[submitNr1Answers]', { qnId, answers })

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) throw new Error(`Failed to submit answers: ${res.status}`)
  return await res.json()
}

export async function submitFollowUpAnswers(qnId: string, questions: IQuestionnaireQuestion[], answers: IQuestionnaireAnswer[]) {
  const base = followUpApiUrl || process.env.NEXT_FOLLOW_UP_API_URL || process.env.API_URL || ''
  const url = `${base.replace(/\/$/, '')}/`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionnaire_id: qnId, questions, answers }),
  })
  if (!res.ok) throw new Error(`Failed to submit answers: ${res.status}`)
  return await res.json()
}
