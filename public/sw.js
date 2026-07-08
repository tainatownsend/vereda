// public/sw.js
// Service Worker do Vereda — gerencia notificações push

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Recebe notificação push do servidor
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || 'Hora de continuar sua leitura!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/home',
    },
    actions: [
      { action: 'open', title: 'Ler agora' },
      { action: 'dismiss', title: 'Mais tarde' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Vereda — leitura de hoje',
      options
    )
  )
})

// Usuário clicou na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/home'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, foca nele
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Senão, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})