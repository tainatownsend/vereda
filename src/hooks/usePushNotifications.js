// src/hooks/usePushNotifications.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Converte a chave VAPID de base64 para Uint8Array (necessário para o browser)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Verifica se já tem subscription ativa
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription()
      setSubscribed(!!existing)
    })
  }, [userId])

  // Registra o service worker se ainda não foi
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  }, [])

  const requestPermission = async () => {
    if (!userId) return
    setLoading(true)

    try {
      // Pede permissão ao usuário
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setLoading(false)
        return false
      }

      // Registra service worker e cria subscription
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Salva a subscription no Supabase
      const sub = subscription.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      setSubscribed(true)
      setLoading(false)
      return true

    } catch (err) {
      console.error('Push subscription error:', err)
      setLoading(false)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!userId) return
    setLoading(true)

    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
    }

    setLoading(false)
  }

  return { permission, subscribed, loading, requestPermission, unsubscribe }
}