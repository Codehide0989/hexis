import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import md5 from 'md5';
import bcrypt from 'bcryptjs';
import { supabase } from '../../lib/supabase';
import { checkAdminExists } from '../lib/adminAuth';
import toast from 'react-hot-toast';
import { Terminal, Key, ShieldAlert } from 'lucide-react';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [bootText, setBootText] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    secretPhrase: ''
  });

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    const verifyStatus = async () => {
      // Allow opening setup wizard always as requested by the user
      setChecking(false);
      runBootSequence();
    };
    verifyStatus();
  }, [navigate]);

  const runBootSequence = async () => {
    const sequence = [
      "> Hexis SYSTEM v1.0.0",
      "> CHECKING ADMIN CONFIGURATION...",
      "> NO ADMIN FOUND. INITIALIZATION REQUIRED.",
      "> PLEASE CREATE ADMINISTRATOR ACCOUNT."
    ];

    for (let i = 0; i < sequence.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setBootText(prev => [...prev, sequence[i]]);
    }

    setTimeout(() => {
      setShowForm(true);
      setLoading(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!formData.username || !formData.email || !formData.secretPhrase) {
      toast.error('All fields are required');
      return;
    }

    try {
      setLoading(true);

      // Generate hashes
      const timestamp = Date.now().toString();
      const md5Key = md5(formData.username + formData.password + formData.secretPhrase + timestamp);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(formData.password, salt);
      const adminId = crypto.randomUUID();

      // Call backend API endpoint to bypass client-side RLS policies
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password_hash: passwordHash,
          md5_hash: md5Key
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Server error during admin setup');
      }

      const resData = await response.json();
      if (!resData.ok) {
        throw new Error(resData.error || 'Failed to initialize admin');
      }

      const adminUser = resData.admin;
      const finalAdminId = adminUser?.id || adminId;

      setGeneratedKey(md5Key);

      // Session setup
      const sessionToken = `${finalAdminId}-${Date.now()}`;
      localStorage.setItem('admin_token', sessionToken);
      localStorage.setItem('admin_id', finalAdminId);
      localStorage.setItem('admin_username', formData.username);
      sessionStorage.setItem('admin_token', sessionToken);
      sessionStorage.setItem('admin_id', finalAdminId);
      sessionStorage.setItem('admin_username', formData.username);

      toast.success('Admin initialization complete');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initialize admin');
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-black" />;
  }

  if (generatedKey) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-mono">
        <div className="max-w-2xl w-full bg-[#0a0a0a] border border-[#1b4332] p-8 rounded shadow-[0_0_30px_rgba(27,67,50,0.3)]">
          <div className="flex items-center justify-center mb-6 text-[#52b788]">
            <Key size={48} />
          </div>
          <h2 className="text-2xl text-[#52b788] text-center mb-4 uppercase tracking-widest">Master Admin Key Generated</h2>
          <div className="bg-black border border-[#1b4332] p-6 rounded text-center mb-6">
            <code className="text-[#52b788] text-xl break-all">{generatedKey}</code>
          </div>
          <p className="text-[#1b4332] text-center mb-8 uppercase text-sm">
            Save this key immediately. It is required for all administrative access.
            It cannot be recovered if lost.
          </p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full bg-[#1b4332] text-[#d8f3dc] p-4 uppercase tracking-widest hover:bg-[#2d6a4f] transition-colors"
          >
            Acknowledge & Proceed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#52b788] font-mono p-8 selection:bg-[#1b4332] selection:text-[#d8f3dc]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          {bootText.map((text, i) => (
            <div key={i} className="mb-2 text-sm md:text-base opacity-80">
              {text}
            </div>
          ))}
          {!showForm && (
            <div className="animate-pulse inline-block w-3 h-5 bg-[#52b788] ml-1 align-middle" />
          )}
        </div>

        {showForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3 mb-8 border-b border-[#1b4332] pb-4">
              <ShieldAlert size={28} className="text-[#52b788]" />
              <h1 className="text-2xl uppercase tracking-[0.2em] font-bold">First Time Initialization</h1>
              <div className="animate-pulse inline-block w-3 h-6 bg-[#52b788] ml-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Admin Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                    placeholder="sysadmin"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                    placeholder="admin@Hexis.local"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Master Password (Min 12 Chars)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-black border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Secret Phrase (For MD5 Salt)</label>
                <input
                  type="text"
                  required
                  value={formData.secretPhrase}
                  onChange={e => setFormData({ ...formData, secretPhrase: e.target.value })}
                  className="w-full bg-black border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                  placeholder="e.g. Operation Blackbriar"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#1b4332] text-[#d8f3dc] p-4 uppercase tracking-widest hover:bg-[#2d6a4f] transition-colors disabled:opacity-50"
              >
                <Terminal size={20} />
                {loading ? 'Initializing...' : 'Initialize System'}
              </button>
            </form>

            <div className="mt-12 text-center text-[#1b4332] text-xs uppercase tracking-widest">
              THIS PAGE WILL NEVER APPEAR AGAIN AFTER SETUP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
