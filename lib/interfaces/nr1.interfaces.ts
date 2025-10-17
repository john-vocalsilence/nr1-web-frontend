import { IChatMessage } from "./chat.interfaces"

type TInputType = 'radio' | 'select' | 'likert' | 'textarea'

interface IQuestionnaireQuestion {
	id: number
	question: string
	options: string[] | string
	required: boolean
	type: TInputType
	html: string
	dimension: string
	dimension_id: number
}

interface IQuestionnaire {
	id: string
	questions: IQuestionnaireQuestion[]
	expiration: string
	organization_name: string
}

interface IQuestionnaireAnswer {
	id: number
	response: number | string
}

interface IFollowUpResponse {
	questionnaire?: IQuestionnaire
	message?: string
}

interface ILlmMessage {
	message: IChatMessage
}

export type { IQuestionnaireQuestion, IQuestionnaireAnswer, IQuestionnaire, ILlmMessage, IFollowUpResponse }
