// src/hooks/usePushNotifications.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function notificationsSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

function getInitialPermission() {
  return notificationsSupported() ? window.Notification.permission : 'denied'
}

// Converte a chave VAPID de base64 para Uint8Array (necessário para o browser)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(getInitialPermission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId || !notificationsSupported()) return undefined

    let cancelled = false

    const checkSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (!cancelled) {
          setSubscribed(!!existing)
        }
      } catch (err) {
        console.error('[Push] Erro ao verificar subscription:', err)
      }
    }

    checkSubscription()

    return () => { cancelled = true }
  }, [userId])

  const requestPermission = async () => {
    if (!userId || !notificationsSupported() || !VAPID_PUBLIC_KEY) return false
    setLoading(true)

    try {
      const result = await window.Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) throw error

      setSubscribed(true)
      return true
    } catch (err) {
      console.error('Push subscription error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!userId || !notificationsSupported()) return false
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
      return true
    } catch (err) {
      console.error('Unsubscribe error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { permission, subscribed, loading, requestPermission, unsubscribe }
}
