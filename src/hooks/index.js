import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore, useReadingStore } from '@/store'

// Estima tempo de leitura baseado em palavras
export function useReadingTime(wordCount) {
  const WPM = 200
  const minutes = Math.ceil((wordCount || 0) / WPM)
  if (minutes < 1) return '< 1 min'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}

// Percentual de progresso num livro
export function useProgress(bookId, totalSections) {
  const progress = useReadingStore(s => s.progress[bookId])
  if (!progress || !totalSections) return 0
  return Math.round(((progress.current_section - 1) / totalSections) * 100)
}

// Percentual de scroll na página (barra do leitor)
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return progress
}

// Cronômetro de leitura em segundos
export function useReadingTimer() {
  const [seconds, setSeconds] = useState(0)
  const secondsRef = useRef(0)
  const intervalRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
    }, 1000)
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    return secondsRef.current
  }, [clearTimer])

  const reset = useCallback(() => {
    clearTimer()
    secondsRef.current = 0
    setSeconds(0)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  return { seconds, start, stop, reset }
}

// Busca e mantém lista de livros atualizada
export function useBooks() {
  const { books, fetchBooks } = useReadingStore()
  useEffect(() => {
    if (!books.length) fetchBooks()
  }, [books.length, fetchBooks])
  return books
}

// Carrega dados do usuário logado
export function useUserData() {
  const { user }    = useAuthStore()
  const { fetchProgress, fetchStreak, progress, streak } = useReadingStore()
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setDataLoading(true)
      Promise.all([fetchProgress(user.id), fetchStreak(user.id)])
        .finally(() => setDataLoading(false))
    }
  }, [user, fetchProgress, fetchStreak])

  return { user, progress, streak, dataLoading }
}

// Data estimada de conclusão de um livro
export function useEstimatedCompletion(bookId, totalSections) {
  const progress = useReadingStore(s => s.progress[bookId])
  if (!progress || !totalSections) return null
  const remaining = totalSections - progress.current_section + 1
  if (remaining <= 0) return 'Concluído'
  if (progress.pace_mode === 'deadline' && progress.pace_deadline) {
    return new Date(progress.pace_deadline).toLocaleDateString('pt-BR', {
      month: 'long', year: 'numeric'
    })
  }
  const sectionsPerDay = Math.max(1, Math.round(((progress.pace_minutes || 10) * 200) / 500))
  const date = new Date()
  date.setDate(date.getDate() + Math.ceil(remaining / sectionsPerDay))
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

// ─── useReadingMinutesLast7Days ───────────────────────────────
export function useReadingMinutesLast7Days() {
  const { user } = useAuthStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase')
      const { data: result } = await supabase.rpc('get_reading_minutes_last_7_days', {
        p_user_id: user.id,
      })
      setData(result || [])
      setLoading(false)
    }
    load()
  }, [user])

  return { data, loading }
}

// ─── useBookCompletionEstimate ─────────────────────────────────
export function useBookCompletionEstimate(bookId) {
  const { user } = useAuthStore()
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !bookId) return
    const load = async () => {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.rpc('get_book_completion_estimate', {
        p_user_id: user.id,
        p_book_id: bookId,
      })
      setEstimate(data?.[0] || null)
      setLoading(false)
    }
    load()
  }, [user, bookId])

  return { estimate, loading }
}


// ─── useMinutesReadToday ────────────────────────────────────────
export function useMinutesReadToday() {
  const { user } = useAuthStore()
  const [minutes, setMinutes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.rpc('get_minutes_read_today', {
        p_user_id: user.id,
      })
      setMinutes(data || 0)
      setLoading(false)
    }
    load()
  }, [user])

  return { minutes, loading }
}