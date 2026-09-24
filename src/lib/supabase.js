import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail closed without throwing during module loading (which leaves a blank page).
export let supabase = null
try {
  if (supabaseUrl && supabaseKey) supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} catch {
  // The root renders a recovery screen; never substitute a production backend.
}
export const hasSupabaseConfiguration = Boolean(supabase)
