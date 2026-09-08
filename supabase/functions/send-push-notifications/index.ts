// supabase/functions/send-push-notifications/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function getContinuationLabel(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('book_id, current_section, last_read_at, completed_at')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('last_read_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (progressError || !progress?.book_id) return null

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('title')
    .eq('id', progress.book_id)
    .maybeSingle()

  if (bookError || !book?.title) return null

  return {
    bookTitle: book.title,
    section: Number(progress.current_section) || 1,
  }
}

serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidEmail = Deno.env.get('VAPID_EMAIL')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!supabaseUrl || !serviceRoleKey || !vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
      return json({ error: 'Push notification configuration is incomplete.' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, '0')
    const currentMinute = now.getMinutes().toString().padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, notify_time')
      .not('notify_time', 'is', null)
      .like('notify_time', `${currentTime}%`)

    if (profilesError) return json({ error: 'Could not load reminder recipients.' }, 500)
    if (!profiles?.length) return json({ sent: 0 })

    const today = now.toISOString().split('T')[0]
    let sent = 0

    for (const profile of profiles) {
      const { data: sessions, error: sessionError } = await supabase
        .from('reading_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('read_at', today)
        .limit(1)

      if (sessionError || sessions?.length) continue

      const { data: sub, error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (subscriptionError || !sub) continue

      const firstName = profile.name?.split(' ')[0]?.trim() || ''
      const continuation = await getContinuationLabel(supabase, profile.id)
      const prefix = firstName ? `${firstName}, ` : ''
      const body = continuation
        ? `${prefix}seu próximo trecho em ${continuation.bookTitle} continua aqui quando você quiser retomar.`
        : `${prefix}seu caminho de estudo continua disponível quando você quiser voltar.`

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'Vereda',
            body,
            url: '/home',
            kind: 'study-continuation',
          })
        )
        sent += 1
      } catch (err) {
        const statusCode = Number((err as { statusCode?: number })?.statusCode)
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', profile.id)
        }
      }
    }

    return json({ sent })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected push notification error.'
    return json({ error: message }, 500)
  }
})
