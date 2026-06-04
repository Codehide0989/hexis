import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/auth';

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
      // 1. Sign in with Supabase auth first (to get around Row Level Security)
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
              md5_hash: accessKey.trim()
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

      // 2. Now authenticated, fetch profile to verify access key
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.trim())
        .single();
        
      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('IDENTIFIER NOT FOUND');
      }

      // 3. Verify md5_hash matches accessKey
      if (profile.md5_hash !== accessKey.trim()) {
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
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">ACCESS KEY (MD5)</label>
            <input 
              type="text" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] text-[#52b788] font-mono text-sm p-3 outline-none transition-all rounded-none" 
              placeholder="Paste your 32-char key" 
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
              required 
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
