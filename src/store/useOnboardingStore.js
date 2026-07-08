import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
  persist(
    (set) => ({
      completed: false,
      chosenBookId: null,
      paceMode: null,      // 'diario' | 'semanal'
      paceMinutes: null,   // ex: 10, 15, 30
      setChoice: (data) => set(data),
      complete: () => set({ completed: true }),
      reset: () => set({ completed: false, chosenBookId: null, paceMode: null, paceMinutes: null }),
    }),
    { name: 'vereda-onboarding' }
  )
);