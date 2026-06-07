import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, Key, Copy, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import md5 from 'md5';
import { supabase } from '../lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (generatedHash) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [generatedHash, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg('PASSPHRASES DO NOT MATCH');
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if username already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg('IDENTIFIER ALREADY REGISTERED. PLEASE AUTHENTICATE INSTEAD.');
        setLoading(false);
        return;
      }

      // a. Generate MD5 hash
      const timestamp = Date.now().toString();
      const hash = md5(username + password + timestamp);
      
      // b. Create Supabase auth user
      // Sanitize username for email creation to prevent "invalid format" errors
      const safeUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const email = `${safeUsername}@HEXIS-system.com`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            md5_hash: hash,
          }
        }
      });

      if (authError) throw authError;

      // c. Insert into profiles table
      const userId = authData?.user?.id;
      
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{ id: userId, username, md5_hash: hash }], { onConflict: 'id' });

        if (profileError) throw profileError;
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{ username, md5_hash: hash }], { onConflict: 'username' });

        if (profileError) throw profileError;
      }

      // d. Show modal
      setGeneratedHash(hash);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'REGISTRATION FAILED');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedHash) {
      navigator.clipboard.writeText(generatedHash);
      setHasCopied(true);
      toast.success('Access Key copied to clipboard', {
        style: { background: '#0d2818', color: '#52b788', border: '1px solid #1b4332' }
      });
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
            <Key size={20} className="text-[#52b788]" />
            CREATE ACCOUNT
          </h1>
          <p className="font-sans text-xs text-[#95d5b2]">Sign up to get started with HEXIS.</p>
        </div>
        
        {errorMsg && (
          <div className="mb-6 border border-[#e63946] bg-[#1a0f0f] p-3 text-[#e63946] font-mono text-xs text-center uppercase">
            {errorMsg}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSignup}>
          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">EMAIL ADDRESS</label>
            <input 
              type="text" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono text-sm px-4 py-3 outline-none focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] placeholder-[#2d6a4f] transition-colors" 
              placeholder="Enter your alias" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required 
            />
          </div>
          
          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">PASSWORD</label>
            <input 
              type="password" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono text-sm px-4 py-3 outline-none focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] placeholder-[#2d6a4f] transition-colors" 
              placeholder="••••••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>

          <div className="block">
            <label className="font-mono text-xs text-[#52b788] tracking-widest uppercase mb-2 block">CONFIRM PASSWORD</label>
            <input 
              type="password" 
              className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono text-sm px-4 py-3 outline-none focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] placeholder-[#2d6a4f] transition-colors" 
              placeholder="••••••••••••" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#52b788] text-[#0a1a0f] hover:bg-[#74c69d] font-mono font-bold tracking-widest text-sm p-3 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed rounded-none border-none"
          >
            {loading ? 'GENERATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>
        
        <div className="my-6 border-b border-[#1b4332]"></div>
        
        <div className="text-center block">
          <p className="font-mono text-xs text-[#95d5b2]">
            ALREADY HAVE AN ACCOUNT? <Link to="/login" className="text-[#52b788] hover:text-[#d8f3dc] transition-colors ml-2 no-underline">LOG IN</Link>
          </p>
        </div>
      </div>

      <AnimatePresence>
        {generatedHash && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a1a0f]/95 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#0d2818] border border-[#1b4332] w-full max-w-xl p-8 rounded-none shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#1b4332]">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="h-full bg-[#e63946]"
                />
              </div>

              <h2 className="font-mono font-bold text-2xl text-[#d8f3dc] uppercase tracking-widest mb-4 mt-2">YOUR ACCESS KEY</h2>
              
              <div className="font-mono text-[#e63946] text-xs mb-8 p-4 border border-[#e63946] bg-[#1a0f0f] uppercase leading-relaxed font-bold">
                WARNING: SAVE THIS KEY IMMEDIATELY. IT CANNOT BE RECOVERED. THIS KEY IS REQUIRED FOR EVERY LOGIN.
                <br /><br />
                AUTO-REDIRECTING TO SECURE VAULT IN {countdown} SECONDS...
              </div>
              
              <div className="bg-[#0a1a0f] border border-[#1b4332] p-6 mb-8 text-center break-all relative group">
                <span className="font-mono text-3xl md:text-4xl text-[#52b788] tracking-wider">{generatedHash}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full bg-transparent border border-[#52b788] text-[#52b788] hover:bg-[#52b788] hover:text-[#0a1a0f] p-3 flex items-center justify-center gap-2 font-mono text-sm tracking-widest uppercase transition-colors rounded-none"
                >
                  {hasCopied ? <CheckSquare size={18} /> : <Copy size={18} />}
                  {hasCopied ? 'COPIED TO CLIPBOARD' : 'COPY KEY NOW'}
                </button>
                <button 
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full font-mono text-sm tracking-widest uppercase transition-colors p-3 rounded-none border bg-[#52b788] text-[#0a1a0f] hover:bg-[#74c69d] border-[#52b788]"
                >
                  ENTER DASHBOARD EARLY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
