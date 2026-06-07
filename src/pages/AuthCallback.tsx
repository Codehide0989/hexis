import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (data.session) {
          const user = data.session.user
          
          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, md5_hash')
            .eq('id', user.id)
            .maybeSingle()
          
          if (!profile) {
            // New Discord user — create profile + generate MD5
            const md5 = await import('md5')
            const username = 
              user.user_metadata?.username ||
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'user_' + user.id.slice(0, 6)
            
            const md5Hash = md5.default(
              username + user.id + Date.now().toString()
            )
            
            await supabase.from('profiles').insert({
              id: user.id,
              username: username.toLowerCase()
                .replace(/[^a-z0-9_]/g, '_')
                .substring(0, 20),
              md5_hash: md5Hash,
              discord_id: user.user_metadata?.provider_id || null,
            })

            // Auto-create COVERT subscription
            await supabase.from('user_subscriptions')
              .insert({ user_id: user.id, plan: 'covert' })
              .then(() => {})

            // Show MD5 key to user
            toast.success(
              `ACCOUNT CREATED! Your MD5 key: ${md5Hash}`,
              { duration: 10000 }
            )
          }
          
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        toast.error('Login failed: ' + err.message)
        navigate('/login', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border border-[#52b788] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-xs text-[#52b788] tracking-widest animate-pulse">
          AUTHENTICATING VIA DISCORD...
        </p>
      </div>
    </div>
  )
}
