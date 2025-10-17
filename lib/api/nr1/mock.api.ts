import type { IChatMessage, ILlmMessage, IQuestionnaire, IQuestionnaireAnswer } from '@/lib/interfaces'
import { getMockQuestionnaire, mockLlmResponse, requestFollowUp } from '@/lib/mock/nr1'

export async function getQuestionnaire(qId: string): Promise<IQuestionnaire> {
  return getMockQuestionnaire(qId)
}

export async function getNextQuestion(qId: string, payload: { message: IChatMessage | string }): Promise<ILlmMessage> {
  return mockLlmResponse(qId, payload)
}

export async function submitAnswers(qnId: string, answers: IQuestionnaireAnswer[]) {
  // eslint-disable-next-line no-console
  console.log('[submitAnswers]', { qnId, answers })
  return { success: true }
}

export async function requestFollowUpQuestionnaire(qnId: string, answers: IQuestionnaireAnswer[]) {
  return requestFollowUp(qnId, answers)
}

