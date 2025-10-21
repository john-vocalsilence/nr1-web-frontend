import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { nr1Api } from "@/lib/api"
import { useNr1Store } from "@/lib/store/nr1"
import { normalizeOptions } from "@/lib/utils/nr1"
import {
  isQuestionMessage,
  isInternalMessage,
  type IChatMessage,
  type ILlmMessage,
  type IQuestionnaireQuestion,
  IInternalMessage,
} from "@/lib/interfaces"
import { set } from "date-fns"

export type IntroData = { org: string; dueStr: string; type: string }

export function useNr1Chat() {
  const router = useRouter()
  const { qnId } = useParams<{ qnId: string }>()
  const redirectUrl = "/"

  const { questionnaire, setCurrentQuestionId, setQuestionnaire, answers, addAnswer, reset, submitted, markSubmitted } = useNr1Store()

  const [messages, setMessages] = useState<IChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentQ, setCurrentQ] = useState<IQuestionnaireQuestion | null>(null)
  const [awaitingConsent, setAwaitingConsent] = useState(true)
  const [sessionDone, setSessionDone] = useState(false)
  const [intro, setIntro] = useState<IntroData | null>(null)

  const options = useMemo(() => normalizeOptions(currentQ?.options ?? []), [currentQ])
  const hasOptions = !!currentQ && currentQ.type && currentQ.type !== "textarea" && options.length > 0
  const showFreeText = !awaitingConsent && !!currentQ && (!currentQ.type || currentQ.type === "textarea")

  // Helper function to calculate typing delay based on message length
  const calculateTypingDelay = (text: string): number => {
    const baseDelay = 400 // Minimum delay
    const wordsPerMinute = 1200 // Simulated reading/typing speed
    const words = text.split(' ').length
    const readingTime = (words / wordsPerMinute) * 60 * 1000 // Convert to milliseconds
    return Math.max(baseDelay, Math.min(readingTime, 3000)) // Cap at 3 seconds
  }

  // Helper function to add message with typing delay
  const addMessageWithTyping = async (message: IChatMessage): Promise<void> => {
    if (!message.content) {
      // No delay for empty messages
      setMessages((p) => [...p, message])
      return
    }

    const delay = calculateTypingDelay(message.content)
    
    // Show typing indicator
    setIsTyping(true)
    
    // Wait for typing delay
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // Hide typing indicator and add message
    setIsTyping(false)
    setMessages((p) => [...p, message])
  }

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      reset()
      try {
        const qn = await nr1Api.getNr1Questionnaire(String(qnId))
        setQuestionnaire(qn)
        const org = qn.organization_name || "sua organização"
        const due = qn.expiration ? new Date(qn.expiration) : null
        const dueStr = due
          ? due.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
          : "em breve"
        setIntro({ org, dueStr, type: "NR1" })
        setMessages([])
        setAwaitingConsent(true)
        setCurrentQ(null)
      } finally {
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qnId])

  async function handleLlmResponse(res: ILlmMessage) {
    if (!res) return
    if (res.message && isInternalMessage(res.message)) {
      let msg = res.message as IInternalMessage
      if (msg.code === 'event_no_next_question') {
        !questionnaire?.id.startsWith('comp-') ? submitNr1AndGetFollowUp() : submitFollowUpAndRedirect()
      }
      return
    }
    if (res.message) {
      await addMessageWithTyping(res.message)
    }
    if (res.message && isQuestionMessage(res.message)) {
      setCurrentQuestionId(res.message.qId)
      setCurrentQ({
        id: res.message.qId,
        question: res.message.content,
        type: res.message.type,
        options: res.message.options ?? [],
      } as IQuestionnaireQuestion)
      return
    }
  }

  async function consentAndStartNr1() {
    if (!intro) return
    setAwaitingConsent(false)
    const introMsg: IChatMessage = {
      msgId: `m-introchat-${Date.now()}`,
      schema: "text",
      role: "assistant",
      content: `Bem-vindo ao Questionário ${intro.type} da organização ${intro.org}. Vamos começar!`,
      timestamp: new Date().toISOString(),
    }
    
    await addMessageWithTyping(introMsg)
    
    setIsLoading(true)
    try {
      const res = await nr1Api.getNextQuestion()
      await handleLlmResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  async function leaveFlow() {
    const bye: IChatMessage = {
      msgId: `m-bye-${Date.now()}`,
      schema: "text",
      role: "assistant",
      content: "Obrigado pela visita. As suas respostas NÃO foram salvas. Você pode voltar depois para refazer o questionário. Até mais!",
      timestamp: new Date().toISOString(),
    }
    
    await addMessageWithTyping(bye)
    setAwaitingConsent(true)
    useNr1Store.getState().reset()
    setTimeout(() => router.push(redirectUrl), 1500)
  }

  async function submitNr1AndGetFollowUp() {
    setIsLoading(true)
    const payload = useNr1Store.getState().answers
    try {
      await nr1Api.submitNr1Answers(String(qnId), payload || [])
      markSubmitted()

      const nextQn = await nr1Api.getFollowUpQuestionnaire(String(qnId), payload || [])
      
      if (!nextQn || !nextQn.questions || nextQn.questions.length === 0) {
        return await gracefulExit()
      }
      
      reset()
      setCurrentQ(null)
      setQuestionnaire(nextQn)
      
      const followUpMsg: IChatMessage = {
        msgId: `m-start-followup-${Date.now()}`,
        schema: "text",
        role: "assistant",
        content: "Há um questionário de acompanhamento. Vamos continuar.",
        timestamp: new Date().toISOString(),
      }
      
      await addMessageWithTyping(followUpMsg)
      
      const res = await nr1Api.getNextQuestion()
      await handleLlmResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  async function submitFollowUpAndRedirect() {
    setIsLoading(true)
    const payload = useNr1Store.getState().answers
    try {
      await nr1Api.submitFollowUpAnswers(String(qnId), payload || [])
    } finally {
      setIsLoading(false)
      await gracefulExit()
    }
  }

  async function gracefulExit() {
    if (sessionDone) return
    setSessionDone(true)
    const thanks: IChatMessage = {
      msgId: `m-thanks-${Date.now()}`,
      schema: "text",
      role: "assistant",
      content: "Obrigado por completar o questionário.",
      timestamp: new Date().toISOString(),
    }
    
    await addMessageWithTyping(thanks)
    setIsLoading(false)
    reset()
    setTimeout(() => router.push(redirectUrl), 2000)
  }

  const handleSubmit = async (e?: React.FormEvent, provided?: string | number) => {
    e?.preventDefault()
    if (!questionnaire || isLoading || isTyping || !currentQ || submitted) return

    if (typeof provided === "undefined") {
      provided = input.trim()
      if (!provided) return
    }

    let response: string | number = ""
    if (currentQ.type === "radio" || currentQ.type === "select" || currentQ.type === "likert") {
      const idx = Number(provided)
      if (isNaN(idx) || idx < 0 || idx >= options.length) return
      response = options[idx]
    } else {
      response = String(provided)
    }

    const userMessage: IChatMessage = {
      msgId: `u-${Date.now()}`,
      schema: "text",
      role: "user",
      content: String(response),
      timestamp: new Date().toISOString(),
    }
    setMessages((p) => [...p, userMessage])

    addAnswer({ id: currentQ.id, response: provided })
    setInput("")
    setIsLoading(true)

    // Loop to get next question
    try {
      const res = await nr1Api.getNextQuestion()
      await handleLlmResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async ( value: string | number ) => {
    if (!currentQ || isLoading || isTyping || submitted) return
    return handleSubmit(undefined, value)
  }

  const canSkip = !!currentQ && (!currentQ.required)
  const skipQuestion = async () => {
    if (!currentQ || isLoading || isTyping || submitted) return
    
    // Add answer without creating a user message
    addAnswer({ id: currentQ.id, response: '' })
    setIsLoading(true)

    // Get next question directly without showing user message
    try {
      const res = await nr1Api.getNextQuestion()
      await handleLlmResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // state
    questionnaire,
    messages,
    input,
    isLoading,
    isTyping,
    currentQ,
    intro,
    awaitingConsent,
    options,
    hasOptions,
    showFreeText,
    // actions
    setInput,
    consentAndStartNr1,
    leaveFlow,
    handleSubmit,
    submitAnswer,
    canSkip,
    skipQuestion,
    setMessages, // in case page wants to add messages directly (bypassing typing delay)
    addMessageWithTyping, // for manual message addition with typing effect
  }
}
