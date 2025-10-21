export type TChatRole = 'user' | 'assistant' | 'system'

export interface IBaseMessage {
  msgId?: string
  role: TChatRole
  content?: string
  timestamp?: string | Date
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

export interface IInternalMessage extends IBaseMessage {
  schema: 'internal'
  code: string | number | null | undefined
}

export type IChatMessage = ITextMessage | IQuestionMessage | IBaseMessage

export function isTextMessage(m: IChatMessage): m is ITextMessage {
  return (m as any)?.schema === 'text'
}

export function isQuestionMessage(m: IChatMessage): m is IQuestionMessage {
  return (m as any)?.schema === 'question'
}
