import { supabase } from './supabase'

export const generateDiscordLinkCode = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Generate 8-char code
  const code = Math.random().toString(36)
    .substr(2, 8).toUpperCase()
  
  const { error } = await supabase
    .from('discord_link_codes')
    .insert({
      user_id: user.id,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
  
  if (error) {
    console.error('Link code error:', error)
    return null
  }
  return code
}
