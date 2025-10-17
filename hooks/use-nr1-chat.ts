import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { mockApi as nr1Api } from "@/lib/api"
import { useNr1Store } from "@/lib/store/nr1"
import { normalizeOptions } from "@/lib/utils/nr1"
import {
  isQuestionMessage,
  isTextMessage,
  type IChatMessage,
  type ILlmMessage,
  type IQuestionnaireQuestion,
  type IFollowUpResponse,
} from "@/lib/interfaces"

export type IntroData = { org: string; dueStr: string; type: string }

export function useNr1Chat() {
  const router = useRouter()
  const { qId } = useParams<{ qId: string }>()
  const redirectUrl = "/"

  const { questionnaire, currentQuestionId, currentAnswerId, setCurrentQuestionId, setCurrentAnswerId, setQuestionnaire, answers, addAnswer, reset, submitted, markSubmitted } = useNr1Store()

  const [messages, setMessages] = useState<IChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentQ, setCurrentQ] = useState<IQuestionnaireQuestion | null>(null)
  const [awaitingConsent, setAwaitingConsent] = useState(true)
  const [sessionDone, setSessionDone] = useState(false)
  const [intro, setIntro] = useState<IntroData | null>(null)

  const options = useMemo(() => normalizeOptions(currentQ?.options ?? []), [currentQ])
  const hasOptions = !!currentQ && currentQ.type && currentQ.type !== "textarea" && options.length > 0
  const showFreeText = !awaitingConsent && !!currentQ && (!currentQ.type || currentQ.type === "textarea")

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      reset()
      try {
        const qn = await nr1Api.getQuestionnaire(String(qId))
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
  }, [qId])

  function handleLlmResponse(res: ILlmMessage) {
    if (!res) return
    if (res.message) setMessages((p) => [...p, res.message])
    if (res.message && isQuestionMessage(res.message)) {
      console.log(res.message)
      setCurrentQ({
        id: res.message.qId ?? Date.now(),
        question: res.message.content,
        type: res.message.type,
        options: res.message.options ?? [],
      } as IQuestionnaireQuestion)
      return
    }
    if (res.message && isTextMessage(res.message) && currentQ) finalizeAndMaybeFollowUp()
  }

  async function startQuestions() {
    if (!intro) return
    const introMsg: IChatMessage = {
      msgId: `m-introchat-${Date.now()}`,
      schema: "text",
      role: "assistant",
      content: `Bem-vindo ao Questionário ${intro.type} da organização ${intro.org}. Vamos começar!`,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, introMsg])
    setAwaitingConsent(false)
    setIsLoading(true)
    try {
      const res = await nr1Api.getNextQuestion(String(qId), { message: "start" })
      handleLlmResponse(res)
    } finally {
      setIsLoading(false)
    }
  }

  async function leaveFlow() {
    const bye: IChatMessage = {
      msgId: `m-bye-${Date.now()}`,
      schema: "text",
      role: "assistant",
      content: "Obrigado pela visita. Você pode voltar depois para completar o questionário.",
      timestamp: new Date().toISOString(),
    }
    setMessages((p) => [...p, bye])
    setAwaitingConsent(false)
    setCurrentQ(null)
    setTimeout(() => router.push(redirectUrl), 1500)
  }

  async function completeAndRedirect() {
    if (sessionDone) return
    setSessionDone(true)
    setIsLoading(true)
    try {
      await nr1Api.submitAnswers(String(qId), answers || [])
    } finally {
      const thanks: IChatMessage = {
        msgId: `m-thanks-${Date.now()}`,
        schema: "text",
        role: "assistant",
        content: "Obrigado por completar o questionário.",
        timestamp: new Date().toISOString(),
      }
      setMessages((p) => [...p, thanks])
      setIsLoading(false)
      try {
        const resetStore = (useNr1Store.getState() as any)?.reset
        if (typeof resetStore === "function") resetStore()
        else useNr1Store.setState({ questionnaire: null, answers: [], loaded: false })
      } catch {}
      setTimeout(() => router.push(redirectUrl), 1500)
    }
  }

  async function finalizeAndMaybeFollowUp() {
    setIsLoading(true)
    try {
      await nr1Api.submitAnswers(String(qId), answers || [])
      markSubmitted()

      let followRes: IFollowUpResponse | null = null
      if ((nr1Api as any).requestFollowUpQuestionnaire) {
        followRes = await (nr1Api as any).requestFollowUpQuestionnaire(String(qId), answers || [])
      }

      if (!followRes) {
        setIsLoading(false)
        return completeAndRedirect()
      }

      if (followRes?.questionnaire && Array.isArray(followRes.questionnaire?.questions)) {
        const nextQn = followRes.questionnaire
        setMessages((prev) => [
          ...prev,
          {
            msgId: `m-followup-${Date.now()}`,
            schema: "text",
            role: "assistant",
            content: "Há um questionário de acompanhamento. Vamos continuar.",
            timestamp: new Date().toISOString(),
          } as IChatMessage,
        ])
        setQuestionnaire(nextQn)
        useNr1Store.setState({ answers: [], submitted: false, currentQuestionId: null, currentAnswerId: null })
        setCurrentQ(null)

        const org = nextQn.organization_name || "sua organização"
        const due = nextQn.expiration ? new Date(nextQn.expiration) : null
        const dueStr = due
          ? due.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
          : "em breve"
        setMessages((prev) => [
          ...prev,
          {
            msgId: `m-followup-intro-${Date.now()}`,
            schema: "text",
            role: "assistant",
            content: `Questionário de acompanhamento — Organização: ${org}. Data limite: ${dueStr}.`,
            timestamp: new Date().toISOString(),
          } as IChatMessage,
        ])

        const res = await nr1Api.getNextQuestion(String(qId), { message: "startFollowUp" })
        handleLlmResponse(res)
        setIsLoading(false)
        return
      }

      if (followRes?.message) {
        setMessages((prev) => [
          ...prev,
          {
            msgId: `m-no-followup-${Date.now()}`,
            schema: "text",
            role: "assistant",
            content: typeof followRes.message === "string" ? followRes.message : "Não há questionário de acompanhamento.",
            timestamp: new Date().toISOString(),
          } as IChatMessage,
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            msgId: `m-no-followup-generic-${Date.now()}`,
            schema: "text",
            role: "assistant",
            content: "Não há questionário de acompanhamento.",
            timestamp: new Date().toISOString(),
          } as IChatMessage,
        ])
      }
      setIsLoading(false)
      await completeAndRedirect()
    } catch {
      setIsLoading(false)
      await completeAndRedirect()
    }
  }

  const handleSubmit = async (e?: React.FormEvent, provided?: string | number) => {
    e?.preventDefault()
    if (!questionnaire || isLoading || !currentQ || submitted) return

    let response: string | number | undefined = provided
    if (typeof response === "undefined") {
      const value = input.trim()
      if (!value) return
      response = currentQ.type === "likert" && !Number.isNaN(Number(value)) ? Number(value) : value
    }

    const userMessage: IChatMessage = {
      msgId: `u-${Date.now()}`,
      schema: "text",
      role: "user",
      content: String(response),
      timestamp: new Date().toISOString(),
    }
    setMessages((p) => [...p, userMessage])

    addAnswer({ id: currentQ.id, response })
    setInput("")
    setIsLoading(true)

    try {
      const res = await nr1Api.getNextQuestion(String(qId), { message: userMessage })
      if (!res?.message || !isQuestionMessage(res.message)) {
        if (res?.message) setMessages((p) => [...p, res.message])
        await finalizeAndMaybeFollowUp()
      } else {
        handleLlmResponse(res)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async ({ value }: { value: string }) => {
    if (!currentQ || isLoading || submitted) return
    const normalized = currentQ.type === "likert" && !Number.isNaN(Number(value)) ? Number(value) : value
    return handleSubmit(undefined, normalized)
  }

  const canSkip = !!currentQ && (!currentQ.required)
  const skipQuestion = async () => {
    if (!currentQ || isLoading || submitted) return
    // save empty/placeholder answer for non-required, then advance
    addAnswer({ id: currentQ.id, response: '' })
    return handleSubmit(undefined, '')
  }

  return {
    // state
    questionnaire,
    messages,
    input,
    isLoading,
    currentQ,
    intro,
    awaitingConsent,
    options,
    hasOptions,
    showFreeText,
    // actions
    setInput,
    startQuestions,
    leaveFlow,
    handleSubmit,
    submitAnswer,
    canSkip,
    skipQuestion,
    setMessages, // in case page wants to append system messages
  }
}
