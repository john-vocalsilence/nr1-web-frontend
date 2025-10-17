export type TChatRole = 'user' | 'assistant'

export interface IBaseMessage {
  msgId?: string
  role: TChatRole
  content: any
  timestamp: string | Date
}

export interface ITextMessage extends IBaseMessage {
  schema: 'text'
  content: string
}

export type TQuestionType = 'radio' | 'select' | 'likert' | 'textarea'

export interface IQuestionMessage extends IBaseMessage {
  schema: 'question'
  type: TQuestionType
  qId: number | string
  content: string
  options?: string[]
}

export type IChatMessage = ITextMessage | IQuestionMessage | IBaseMessage

export function isTextMessage(m: IChatMessage): m is ITextMessage {
  return (m as any)?.schema === 'text'
}

export function isQuestionMessage(m: IChatMessage): m is IQuestionMessage {
  return (m as any)?.schema === 'question'
}

