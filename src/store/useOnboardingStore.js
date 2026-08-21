import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const INITIAL_STATE = {
  completed: false,
  familiarity: '',
  intention: '',
  recommendedBookId: null,
  chosenBookId: null,
  paceMode: null,
  paceMinutes: null,
}

export const useOnboardingStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setChoice: (data) => set(data),
      complete: () => set({ completed: true }),
      reset: () => set(INITIAL_STATE),
    }),
    { name: 'vereda-onboarding' },
  ),
)
