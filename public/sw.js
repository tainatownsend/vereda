// public/sw.js
// Service Worker do Vereda — Push + Precache (Workbox injectManifest)

// ============================================
// 1. PRECACHE (Workbox injeta self.__WB_MANIFEST no build)
// ============================================
// O vite-plugin-pwa substitui self.__WB_MANIFEST pelo array de assets
// Se você NÃO quer precache automático, remova esta linha e mude
// strategies para 'generateSW' no vite.config.js
self.__WB_MANIFEST

// Se quiser ativar o precache manualmente com Workbox, descomente:
// importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')
// workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

// ============================================
// 2. LIFECYCLE
// ============================================
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// ============================================
// 3. PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch (err) {
    console.error('[SW] Push payload inválido:', err)
    data = { title: 'Vereda', body: 'Nova atualização disponível' }
  }

  // ⚠️ Ajuste os caminhos para os ícones que você gerou
  const options = {
    body: data.body || 'Hora de continuar sua leitura!',
    icon: '/vereda-icon-192x192.png',        // ← atualizado
    badge: '/vereda-icon-192x192.png',       // ← fallback (badge-72 não existe ainda)
    vibrate: [100, 50, 100],
    tag: data.tag || 'vereda-daily',           // evita notificações duplicadas empilhadas
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/home',
      timestamp: Date.now(),
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
    ).catch(err => {
      console.error('[SW] Falha ao mostrar notificação:', err)
    })
  )
})

// ============================================
// 4. NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/home'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Tenta focar em uma aba/janela já aberta do app
        for (const client of clientList) {
          // client.url pode ser vazio em alguns estados
          const clientUrl = client.url || ''
          const isSameOrigin = clientUrl.startsWith(self.location.origin)

          if (isSameOrigin && 'focus' in client) {
            return client
              .focus()
              .then(() => client.navigate(url))
              .catch(() => clients.openWindow(url)) // fallback se navigate falhar
          }
        }
        // Nenhuma aba aberta → abre nova
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
      .catch((err) => {
        console.error('[SW] Erro ao abrir cliente:', err)
        // Último recurso: tenta abrir janela mesmo assim
        if (clients.openWindow) return clients.openWindow('/home')
      })
  )
})

// ============================================
// 5. BACKGROUND SYNC (opcional — para offline)
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'vereda-sync') {
    event.waitUntil(syncPendingData())
  }
})

async function syncPendingData() {
  // Implemente aqui: enviar leituras pendentes para o servidor
  console.log('[SW] Background sync executado')
}