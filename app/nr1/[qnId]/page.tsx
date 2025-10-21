"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, Menu, Maximize } from "lucide-react"
import Nr1ChatMessage from "@/components/nr1-chat-message"
import Nr1IntroOverlay from "@/components/nr1-intro-overlay"
import Nr1Options from "@/components/nr1-options"
import { useNr1Chat } from "@/hooks/use-nr1-chat"

export default function ChatPage() {
  const {
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
    canSkip,
    setInput,
    startQuestions,
    leaveFlow,
    handleSubmit,
    submitAnswer,
    skipQuestion,
  } = useNr1Chat()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showOptions, setShowOptions] = useState(true)
  const [isSmallScreen, setIsSmallScreen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [footerH, setFooterH] = useState(0)

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.log('Fullscreen toggle failed:', error)
    }
  }

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(() => {
    scrollToBottom()
  }, [messages, footerH])

  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const measure = () => setFooterH(el.getBoundingClientRect().height || 0)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [currentQ, hasOptions, showFreeText, showOptions])

  // Responsive: options always open on md+; collapsible only on small screens
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)") // md
    const apply = (matches: boolean) => {
      setIsSmallScreen(!matches)
      if (matches) setShowOptions(true) // force open on md+
    }
    apply(mq.matches)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Auto-enter fullscreen on mobile devices
  useEffect(() => {
    const enterFullscreen = async () => {
      // Check if it's a mobile device and fullscreen is supported
      const isMobile = window.matchMedia("(max-width: 768px)").matches
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      if ((isMobile || isTouch) && document.documentElement.requestFullscreen) {
        try {
          // Small delay to ensure page is fully loaded
          setTimeout(async () => {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen()
            }
          }, 500)
        } catch (error) {
          // Fullscreen request failed or was denied - this is okay
          console.log('Fullscreen request failed:', error)
        }
      }
    }

    enterFullscreen()
  }, [])

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className="relative min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b bg-blue-900">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-7 w-7 rounded-full border-2 border-white bg-blue-200 shadow-sm">
              <AvatarFallback className="p-0 m-0 bg-transparent rounded-full">
                <Image
                  src="/assets/VocalSilenceLogo.png"
                  alt="VocalSilence"
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </AvatarFallback>
            </Avatar>
            <h1 className="text-sm font-semibold text-white">Vocal Silence - Questionário NR1</h1>
          </div>
          <div className="relative">
            <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setSettingsOpen((s) => !s)}>
              <Menu className="h-5 w-5 text-white" />
            </Button>
            {settingsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-md border bg-card p-3 shadow-md">
                <p className="text-sm">
                  <span className="font-semibold">Tipo:</span> NR1
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Organização:</span> {questionnaire?.organization_name || "-"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Data limite:</span>{" "}
                  {questionnaire?.expiration
                    ? new Date(questionnaire.expiration).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "-"}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2"
                  >
                    <Maximize className="h-4 w-4" />
                    {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                  </Button>
                  <Button variant="destructive" onClick={leaveFlow}>
                    Sair sem finalizar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages area, scrollbar at window edge */}
      <main
        className="overflow-y-auto"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 48,
          bottom: footerH,
          background: "#fff",
        }}
      >
        <div className="space-y-2 p-4 max-w-4xl mx-auto">
          {awaitingConsent && intro ? (
            <Nr1IntroOverlay intro={intro} onContinue={startQuestions} onLeave={leaveFlow} disabled={isLoading} />
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Olá</h2>
              <p className="text-sm text-muted-foreground">Estamos Iniciando...</p>
            </div>
          ) : (
            messages.map((message, idx) => (
              <Nr1ChatMessage key={(message as any).id ?? (message as any).msgId ?? idx} message={message} />
            ))
          )}

          {isLoading && !awaitingConsent && (
            <div className="mt-2 flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} className="h-[100px] sm:h-[80px]" />
      </main>

      {/* Footer with blue→white gradient; options collapsible or text form */}
      <footer ref={footerRef} className="fixed bottom-2 left-2 right-2 z-40 bg-white rounded-md">
        <div
          className="mx-auto max-w-4xl mx-3 my-2 flex flex-col gap-2 max-h-[50vh] overflow-hidden
          rounded-md border border-blue-900 border-2 shadow-lg bg-blue-50 text-blue-900"
        >
          {hasOptions && currentQ ? (
            <>
              <Nr1Options
                currentQ={currentQ}
                options={options}
                isLoading={isLoading}
                onSelect={(value) => submitAnswer(value)}
                onSkip={(!currentQ?.required) ? () => submitAnswer('Continuar') : undefined}
                isOpen={showOptions || !isSmallScreen}      // always open on md+
                onOpen={() => setShowOptions(true)}
                onClose={() => isSmallScreen && setShowOptions(false)}
                smallOnlyCollapsible={isSmallScreen}
              />
            </>
          ) : (
            showFreeText && (
              <form onSubmit={(e) => handleSubmit(e)} className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="text"
                  placeholder="Digite sua resposta…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || !currentQ}
                  className="flex-1 bg-white text-foreground border-blue-200"
                />
                <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || !currentQ || !input.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Enviar</span>
                </Button>
                {canSkip && (
                  <Button type="button" variant="secondary" onClick={skipQuestion} disabled={isLoading || !currentQ}>
                    Pular
                  </Button>
                )}
              </form>
            )
          )}
        </div>
      </footer>
    </div>
  )
}
