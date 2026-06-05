import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/auth';
import { getDiscordOAuthUrl } from '../lib/discord';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      // 1. Fetch profile first to retrieve pre-seeded or existing hash
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.trim())
        .maybeSingle();

      // 2. Sign in with Supabase auth (to get around Row Level Security)
      const safeUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const email = `${safeUsername}@HEXIS-system.com`;
      let { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // If user exists in database but not in Auth (pre-seeded), auto-signup
      if (authError && authError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              md5_hash: accessKey.trim() || profile?.md5_hash || ''
            }
          }
        });
        
        if (!signUpError) {
          // Retry login after auto-signup
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
          authError = retryError;
        }
      }

      if (authError) {
        throw new Error('AUTHENTICATION FAILED: ' + authError.message);
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('IDENTIFIER NOT FOUND');
      }

      // 3. Verify md5_hash matches accessKey (if provided by the user)
      if (accessKey.trim() && profile.md5_hash !== accessKey.trim()) {
        await supabase.auth.signOut();
        throw new Error('INVALID ACCESS KEY');
      }

      // 4. Verify user is not banned
      if (profile.is_banned) {
        await supabase.auth.signOut();
        navigate('/banned');
        return;
      }

      toast.success('ACCESS GRANTED', { 
        style: { background: '#0d2818', color: '#52b788', border: '1px solid #1b4332' } 
      });
      navigate('/dashboard');
      
    } catch (err: any) {
      setErrorMsg(err.message || 'AUTHENTICATION FAILED');
    } finally {
      setLoading(false);
    }
  };

  const startDiscord = () => {
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('hexis_discord_state', state);
    window.location.href = getDiscordOAuthUrl(state);
  };

  return (
    <div className="min-h-screen bg-[#0a1a0f] flex flex-col items-center justify-center p-6 relative font-sans">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#1b4332_1px,transparent_1px),linear-gradient(to_bottom,#1b4332_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.05]"></div>

      <Link to="/" className="flex items-center gap-2 no-underline group mb-8 z-10">
        <img 
          src="/hesixpng.png" 
          alt="HEXIS" 
          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" 
        />
        <span className="font-mono font-bold text-[#52b788] text-2xl tracking-widest uppercase">HEXIS</span>
      </Link>
      
      <div className="w-full max-w-md bg-[#0d2818] border border-[#1b4332] p-8 z-10 relative shadow-xl">
        <div className="text-center mb-8 border-b border-[#1b4332] pb-6">
          <h1 className="font-mono font-bold text-2xl text-[#d8f3dc] uppercase tracking-widest mb-2 flex items-center justify-center gap-3">
            <Lock size={20} className="text-[#52b788]" />
            AUTH_REQUIRED
          </h1>
          <p className="font-sans text-xs text-[#95d5b2]">Please enter your credentials to access the secure vault.</p>
        </div>
        
        {errorMsg && (
          <div className="mb-6 border border-[#e63946] bg-[#1a0f0f] p-3 text-[#e63946] font-mono text-xs text-center uppercase">
            {errorMsg}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">IDENTIFIER</label>
            <input 
              type="text" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] text-[#d8f3dc] font-mono text-sm p-3 outline-none transition-all rounded-none" 
              placeholder="Enter your alias" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required 
            />
          </div>
          
          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">PASSPHRASE</label>
            <input 
              type="password" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] text-[#d8f3dc] font-mono text-sm p-3 outline-none transition-all rounded-none" 
              placeholder="••••••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">ACCESS KEY (MD5) (OPTIONAL)</label>
            <input 
              type="text" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] text-[#52b788] font-mono text-sm p-3 outline-none transition-all rounded-none" 
              placeholder="Paste your 32-char key (or leave blank to login with passphrase)" 
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#52b788] text-[#0a1a0f] hover:bg-[#74c69d] font-mono font-bold tracking-widest text-sm p-3 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed rounded-none border-none mt-4"
          >
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1b4332]" />
          </div>
          <span className="relative bg-[#0d2818] px-3 font-mono text-[10px] text-[#2d6a4f] uppercase tracking-widest">OR</span>
        </div>

        <button type="button" onClick={startDiscord}
          className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-mono text-xs uppercase tracking-widest p-3 transition-colors flex items-center justify-center gap-2 rounded-none border-none cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Sign in with Discord
        </button>

        <div className="my-6 border-b border-[#1b4332]"></div>
        
        <div className="text-center block">
          <p className="font-mono text-xs text-[#95d5b2]">
            UNREGISTERED? <Link to="/signup" className="text-[#52b788] hover:text-[#d8f3dc] transition-colors ml-2 no-underline">INITIALIZE</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
