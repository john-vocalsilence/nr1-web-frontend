import { Button } from "@/components/ui/button"

type IntroData = { org: string; dueStr: string; type: string }

type Props = {
  intro: IntroData
  onContinue: () => void
  onLeave: () => void
  disabled?: boolean
}

export default function Nr1IntroOverlay({ intro, onContinue, onLeave, disabled }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center md:m-12 md:p-18">
      <h2 className="mb-3 text-lg sm:text-xl text-foreground">
        Bem-vindo ao <span className="font-bold">Questionário {intro.type}</span>
      </h2>
      <p className="mb-1 text-sm text-foreground">
        Organização: <span className="font-bold">{intro.org}</span>
      </p>
      <p className="mb-4 text-sm text-foreground">
        Data limite: <span className="font-bold">{intro.dueStr}</span>
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        Deseja continuar agora? Você pode prosseguir ou sair desta página.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onLeave} disabled={disabled}>
          Sair
        </Button>
        <Button onClick={onContinue} disabled={disabled} className="bg-blue-900 hover:bg-blue-700 text-white">
          Continuar
        </Button>
      </div>
    </div>
  )
}