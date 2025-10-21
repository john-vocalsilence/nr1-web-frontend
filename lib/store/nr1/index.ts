import { create } from 'zustand'
import type { IQuestionnaire, IQuestionnaireAnswer } from '@/lib/interfaces'

type Nr1State = {
  questionnaire: IQuestionnaire | null
  loaded: boolean
  currentQuestionId: number | string | null
  currentAnswerId: number | string | null
  answers: IQuestionnaireAnswer[]
  submitted: boolean
  setQuestionnaire: (q: IQuestionnaire) => void
  setCurrentQuestionId: (id: number | string | null) => void
  setCurrentAnswerId: (id: number | string | null) => void
  addAnswer: (a: IQuestionnaireAnswer) => void
  markSubmitted: () => void
  reset: () => void
}

export const useNr1Store = create<Nr1State>((set) => ({
  questionnaire: null,
  loaded: false,
  currentQuestionId: null,
  currentAnswerId: null,
  answers: [],
  submitted: false,
  setQuestionnaire: (q) => set({ questionnaire: q, loaded: true }),
  setCurrentQuestionId: (id) => set({ currentQuestionId: id }),
  setCurrentAnswerId: (id) => set({ currentAnswerId: id }),
  addAnswer: (a) =>
    set((s) => {
      // keep unique by question id if provided
      const filtered = s.answers.filter((x) => x.id !== a.id)
      return { answers: [...filtered, a] }
    }),
  markSubmitted: () => set({ submitted: true }),
  reset: () => set({ questionnaire: null, loaded: false, currentQuestionId: null, currentAnswerId: null, answers: [], submitted: false }),
}))
