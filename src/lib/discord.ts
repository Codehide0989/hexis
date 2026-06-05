import { supabase } from './supabase';

export function getDiscordOAuthUrl(state: string): string {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
  const redirectUri = import.meta.env.VITE_DISCORD_OAUTH_REDIRECT 
    || `${window.location.origin}/auth/discord/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state: state
  });
  
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string) {
  try {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiBase}/api/discord/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function saveDiscordLink(userId: string, profile: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        discord_id: profile.id,
        discord_username: profile.username,
        discord_avatar: profile.avatarUrl,
        discord_email: profile.email,
        discord_linked_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) throw error;
    
    await supabase.from('discord_sync_events').insert({
      user_id: userId,
      discord_id: profile.id,
      event_type: 'discord_linked',
      payload: { username: profile.username, email: profile.email }
    });

    return true;
  } catch (err) {
    console.error('Error saving discord link:', err);
    return false;
  }
}

export async function unlinkDiscord(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        discord_id: null,
        discord_username: null,
        discord_avatar: null,
        discord_email: null,
        discord_linked_at: null,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) throw error;
    
    await supabase.from('discord_sync_events').insert({
      user_id: userId,
      event_type: 'discord_unlinked',
      payload: {}
    });

    return true;
  } catch (err) {
    console.error('Error unlinking discord:', err);
    return false;
  }
}
