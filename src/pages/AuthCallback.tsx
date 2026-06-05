import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { exchangeDiscordCode, saveDiscordLink } from '../lib/discord';

export default function AuthCallback() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const code = sp.get('code');
  const [msg, setMsg] = useState('⬡ LINKING DISCORD…');

  useEffect(() => {
    if (!code) { 
      navigate('/login', { replace: true }); 
      return; 
    }
    if (!user) {
      sessionStorage.setItem('hexis_oauth_code', code);
      navigate('/login?resume=1', { replace: true }); 
      return;
    }
    
    (async () => {
      setMsg('⬡ EXCHANGING CODE…');
      const ex = await exchangeDiscordCode(code);
      if (!ex.ok || !ex.profile) {
        setMsg(`✗ FAILED: ${ex.error || 'unknown'}`);
        setTimeout(() => navigate('/dashboard/settings', { replace: true }), 1500); 
        return;
      }
      
      setMsg('⬡ SAVING LINK…');
      const ok = await saveDiscordLink(user.id, ex.profile);
      if (!ok) { 
        setMsg('✗ FAILED TO SAVE'); 
        setTimeout(() => navigate('/dashboard/settings', { replace: true }), 1500); 
        return; 
      }
      
      setMsg('✓ LINKED — REDIRECTING…');
      setTimeout(() => navigate('/dashboard/settings', { replace: true }), 800);
    })();
  }, [code, user, navigate]);

  return (
    <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center font-mono">
      <div className="text-[#52b788] text-sm tracking-widest animate-pulse">{msg}</div>
    </div>
  );
}
