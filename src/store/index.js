import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { getPasswordResetRedirect } from '@/features/auth/passwordRecovery'
import { getSignupEmailRedirect } from '@/features/auth/signupConfirmation'
import {
  addSavedPassageId,
  getSavedPassageIds,
  removeSavedPassageId,
  SAVED_PASSAGE_METADATA_KEY,
} from '@/features/savedPassages/savedPassages'

// applyOnboardingChoice Function
async function applyOnboardingChoice(userId) {
  const { chosenBookId, paceMode, paceMinutes } = useOnboardingStore.getState()

  if (!chosenBookId) return

  // Aguarda o trigger criar user_progress
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase
      .from('user_progress')
      .select('user_id')
      .eq('user_id', userId)
      .eq('book_id', chosenBookId)
      .maybeSingle()

    if (data) break

    await new Promise(r => setTimeout(r, 300))
  }

  await supabase
    .from('user_progress')
    .update({
      pace_mode: paceMode,
      pace_minutes: paceMinutes,
    })
    .eq('user_id', userId)
    .eq('book_id', chosenBookId)

  useOnboardingStore.getState().reset()
}

// ─── Auth ────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) set({ profile: data })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (data) set({ profile: data })
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    })
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signUpWithEmail: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: getSignupEmailRedirect(window.location.origin),
      },
    })

    if (error) throw error

    // When e-mail confirmation is enabled, signUp returns a user without a
    // session. Defer authenticated data work until the user confirms and signs in.
    if (data.session?.user) {
      await applyOnboardingChoice(data.session.user.id)
    }

    return data
  },

  resendSignupConfirmation: async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getSignupEmailRedirect(window.location.origin),
      },
    })
    if (error) throw error
    return data
  },

  requestPasswordReset: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirect(window.location.origin),
    })
    if (error) throw error
    return data
  },

  updatePassword: async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    return data
  },

  savePassage: async (sectionId) => {
    const { user } = get()
    if (!user) throw new Error('Entre na sua conta para salvar este trecho.')

    const nextIds = addSavedPassageId(getSavedPassageIds(user), sectionId)
    const { data, error } = await supabase.auth.updateUser({
      data: { [SAVED_PASSAGE_METADATA_KEY]: nextIds },
    })

    if (error) throw error
    if (data.user) set({ user: data.user })
    return nextIds
  },

  removeSavedPassage: async (sectionId) => {
    const { user } = get()
    if (!user) return []

    const nextIds = removeSavedPassageId(getSavedPassageIds(user), sectionId)
    const { data, error } = await supabase.auth.updateUser({
      data: { [SAVED_PASSAGE_METADATA_KEY]: nextIds },
    })

    if (error) throw error
    if (data.user) set({ user: data.user })
    return nextIds
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

// ─── Leitura ─────────────────────────────────────────────────
export const useReadingStore = create((set, get) => ({
  books:    [],
  progress: {},
  streak:   0,

  fetchBooks: async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('display_order')
    if (data) set({ books: data })
  },

  fetchProgress: async (userId) => {
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
    if (data) {
      const map = {}
      data.forEach(p => { map[p.book_id] = p })
      set({ progress: map })
    }
  },

  fetchStreak: async (userId) => {
    const { data } = await supabase
      .rpc('get_streak', { p_user_id: userId })
    if (data !== null) set({ streak: data })
  },

  startBook: async (userId, bookId, paceMode, paceMinutes, paceDeadline) => {
    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id:         userId,
        book_id:         bookId,
        pace_mode:       paceMode,
        pace_minutes:    paceMinutes  || null,
        pace_deadline:   paceDeadline || null,
        current_section: 1,
      }, { onConflict: 'user_id,book_id' })
      .select()
      .single()
    if (data) {
      set(state => ({ progress: { ...state.progress, [bookId]: data } }))
    }
    return { data, error }
  },

  markSectionRead: async (userId, bookId, sectionId, nextPosition, durationSeconds) => {
    const lastReadAt = new Date().toISOString()

    await supabase.from('reading_sessions').upsert({
      user_id:    userId,
      book_id:    bookId,
      section_id: sectionId,
      read_at:    new Date().toISOString().split('T')[0],
      duration_s: durationSeconds || null,
    }, { onConflict: 'user_id,section_id' })

    await supabase
      .from('user_progress')
      .update({
        current_section: nextPosition,
        last_read_at:    lastReadAt,
      })
      .eq('user_id', userId)
      .eq('book_id', bookId)

    set(state => ({
      progress: {
        ...state.progress,
        [bookId]: {
          ...state.progress[bookId],
          current_section: nextPosition,
          last_read_at: lastReadAt,
        }
      }
    }))

    await get().fetchStreak(userId)
  },

  getTodaySections: async (userId, bookId) => {
    const { data } = await supabase.rpc('get_todays_sections', {
      p_user_id: userId,
      p_book_id: bookId,
    })
    return data || []
  },
}))

// ─── UI (persiste no localStorage) ───────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      fontSize: 'md',
      appFontScale: 'md',
      darkMode: false,
      setFontSize: (size) => set({ fontSize: size }),
      setAppFontScale: (scale) => set({ appFontScale: scale }),
      toggleDark:  ()     => set(state => ({ darkMode: !state.darkMode })),
    }),
    { name: 'vereda-ui' }
  )
)
