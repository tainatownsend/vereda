// supabase/functions/send-push-notifications/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Biblioteca de web-push para Deno
import webpush from 'https://esm.sh/web-push@3.6.7'

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Configura as chaves VAPID
    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, '0')
    const currentMinute = now.getMinutes().toString().padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    // Busca usuários com lembrete no horário atual
    // que não leram hoje ainda
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, notify_time')
      .not('notify_time', 'is', null)
      .like('notify_time', `${currentTime}%`)

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    let sent = 0

    for (const profile of profiles) {
      // Verifica se já leu hoje
      const today = new Date().toISOString().split('T')[0]
      const { data: sessions } = await supabase
        .from('reading_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('read_at', today)
        .limit(1)

      // Se já leu hoje, não manda notificação
      if (sessions && sessions.length > 0) continue

      // Busca subscription do usuário
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', profile.id)
        .single()

      if (!sub) continue

      const firstName = profile.name?.split(' ')[0] || 'Amigo'

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'Vereda 📖',
            body: `${firstName}, sua leitura de hoje está esperando. Que tal 10 minutos agora?`,
            url: '/home',
          })
        )
        sent++
      } catch (err) {
        // Se o endpoint está inválido (usuário desinstalou o app), remove
        if (err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', profile.id)
        }
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})