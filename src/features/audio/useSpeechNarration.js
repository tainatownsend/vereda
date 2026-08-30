import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_CHUNK_LENGTH = 220

export function speechNarrationSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window
}

export function chunkNarrationText(text, maxLength = MAX_CHUNK_LENGTH) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentences = normalized.split(/(?<=[.!?;:])\s+/)
  const chunks = []

  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      chunks.push(sentence)
      continue
    }

    const words = sentence.split(' ')
    let current = ''

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (candidate.length > maxLength && current) {
        chunks.push(current)
        current = word
      } else {
        current = candidate
      }
    }

    if (current) chunks.push(current)
  }

  return chunks.filter(Boolean)
}

function pickPortugueseVoice(voices) {
  return voices.find((voice) => /^pt-BR$/i.test(voice.lang))
    || voices.find((voice) => /^pt(?:-|$)/i.test(voice.lang))
    || null
}

export function useSpeechNarration() {
  const supported = speechNarrationSupported()
  const [status, setStatus] = useState('idle')
  const [rate, setRate] = useState(0.95)
  const [voices, setVoices] = useState([])
  const queueRef = useRef([])
  const indexRef = useRef(0)
  const generationRef = useRef(0)

  useEffect(() => {
    if (!supported) return undefined

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices)
      generationRef.current += 1
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const speakChunk = useCallback((chunkIndex, generation, playbackRate, voice) => {
    if (!supported || generation !== generationRef.current) return

    const text = queueRef.current[chunkIndex]
    if (!text) {
      setStatus('idle')
      return
    }

    indexRef.current = chunkIndex
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.lang = voice?.lang || 'pt-BR'
    utterance.rate = playbackRate
    if (voice) utterance.voice = voice

    utterance.onend = () => {
      if (generation !== generationRef.current) return
      const next = chunkIndex + 1
      if (next < queueRef.current.length) {
        speakChunk(next, generation, playbackRate, voice)
      } else {
        setStatus('idle')
      }
    }

    utterance.onerror = (event) => {
      if (generation !== generationRef.current) return
      if (event.error === 'canceled' || event.error === 'interrupted') return
      setStatus('idle')
    }

    window.speechSynthesis.speak(utterance)
  }, [supported])

  const speak = useCallback((text) => {
    if (!supported) return false

    const chunks = chunkNarrationText(text)
    if (!chunks.length) return false

    window.speechSynthesis.cancel()
    generationRef.current += 1
    const generation = generationRef.current
    queueRef.current = chunks
    indexRef.current = 0
    setStatus('playing')
    speakChunk(0, generation, rate, pickPortugueseVoice(voices))
    return true
  }, [rate, speakChunk, supported, voices])

  const pause = useCallback(() => {
    if (!supported || status !== 'playing') return
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [status, supported])

  const resume = useCallback(() => {
    if (!supported || status !== 'paused') return
    window.speechSynthesis.resume()
    setStatus('playing')
  }, [status, supported])

  const stop = useCallback(() => {
    if (!supported) return
    generationRef.current += 1
    window.speechSynthesis.cancel()
    queueRef.current = []
    indexRef.current = 0
    setStatus('idle')
  }, [supported])

  return {
    supported,
    status,
    rate,
    setRate,
    speak,
    pause,
    resume,
    stop,
  }
}
