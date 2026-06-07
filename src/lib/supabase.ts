import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      // Persist session in localStorage forever
      persistSession: true,
      
      // Auto refresh token before it expires
      autoRefreshToken: true,
      
      // Detect session from URL (for OAuth flows)
      detectSessionInUrl: true,
      
      // Use localStorage (survives browser close)
      storage: window.localStorage,
      
      // Storage key
      storageKey: 'hexis-auth-v1',
      
      // Session will be refreshed automatically
      // User stays logged in until they click logout
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-application-name': 'hexis',
      },
    },
  }
)
