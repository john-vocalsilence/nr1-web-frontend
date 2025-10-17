import { useEffect, useRef } from "react"
import type { IQuestionnaireQuestion } from "@/lib/interfaces"
import { LIKERT_EMOJI } from "@/lib/utils/nr1"

type Props = {
  currentQ: IQuestionnaireQuestion
  options: string[]
  isLoading: boolean
  version: number
  onSelect: (value: string) => void
  onSkip?: () => void
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  smallOnlyCollapsible?: boolean
}

export default function Nr1Options({
  currentQ,
  options,
  isLoading,
  version,
  onSelect,
  onSkip,
  isOpen,
  onOpen,
  onClose,
  smallOnlyCollapsible = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  // Close on outside click (only when collapsible on small screens)
  useEffect(() => {
    if (!smallOnlyCollapsible || !isOpen) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [isOpen, smallOnlyCollapsible, onClose])

  // Collapsed view (small screens only)
  if (smallOnlyCollapsible && !isOpen) {
    return (
      <div className="text-center flex-1">
        <a
          onClick={onOpen}
          className="mx-auto block text-blue-900 underline text-sm px-4 py-2 shadow hover:bg-blue-700"
        >
          Ver opções
        </a>
      </div>
    )
  }

  // Open view
  return (
    <div ref={wrapRef} className="min-h-0 flex-1 overflow-auto pr-1 m-3">
      {/* Top strip: tap/click to hide (small screens) */}
      {smallOnlyCollapsible && (
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mb-2 block h-2 w-10 rounded-full bg-blue-900/70 hover:bg-blue-400"
          aria-label="Ocultar opções"
          title="Ocultar opções"
        />
      )}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[11px] text-blue-900">
          Selecionar uma opção envia a resposta automaticamente.
        </p>
        {currentQ.required === false && onSkip && (
          <button type="button" onClick={onSkip} className="text-xs text-blue-800 underline disabled:opacity-50" disabled={isLoading}>
            Pular
          </button>
        )}
      </div>
      {renderOptionsBody()}
    </div>
  )

  function renderOptionsBody() {
    if (currentQ.type === "radio" || currentQ.type === "select") {
      return (
        <div
          key={`opts-${version}`}
          className="flex flex-wrap items-center justify-center gap-2 px-2 pb-2 m-3 max-h overflow-auto"
          role="radiogroup"
          aria-label="Opções"
        >
          {options.map((opt) => (
            <label
              key={`q-${currentQ.id}-opt-${opt}`}
              className="inline-flex items-center rounded-md border border-2 border-blue-900 bg-white text-blue-900 hover:bg-blue-50
                         px-3 py-1 text-sm cursor-pointer shadow-sm"
            >
              <input
                type="radio"
                name={`q-${currentQ.id}`}
                value={opt}
                onChange={(e) => onSelect(e.target.value)}
                className="sr-only"
                disabled={isLoading}
              />
              <span className="whitespace-nowrap">{opt}</span>
            </label>
          ))}
        </div>
      )
    }

    if (currentQ.type === "likert") {
      const numbers = ["1", "2", "3", "4", "5"]
      const defaultTexts = ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"]
      const texts = options.length ? options.slice(0, 5) : defaultTexts
      return (
        <div key={`opts-${version}`} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {numbers.map((val, idx) => (
            <button
              key={val}
              type="button"
              onClick={() => onSelect(`${val} - ${texts[idx] || ""}`.trim())}
              className="rounded-md border border-blue-200 px-3 py-2 text-sm bg-white text-foreground hover:bg-blue-50 inline-flex items-center gap-2"
              aria-label={`Opção ${val} ${texts[idx] ? `- ${texts[idx]}` : ""}`}
              disabled={isLoading}
            >
              <span className="font-medium">{val}</span>
              <span aria-hidden="true">{LIKERT_EMOJI[idx]}</span>
              {texts[idx] ? <span className="text-sm text-left">{texts[idx]}</span> : null}
            </button>
          ))}
        </div>
      )
    }

    return null
  }
}
