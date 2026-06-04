import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminLogin, isAdminAuthenticated } from '../lib/adminAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockout, setLockout] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    md5Key: ''
  });

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout) return;

    try {
      setLoading(true);
      await adminLogin(formData.username, formData.password, formData.md5Key);
      toast.success('ACCESS GRANTED');
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error('ACCESS DENIED');
      setFails(prev => {
        const newFails = prev + 1;
        if (newFails >= 5) {
          setLockout(true);
          // Simple client-side lockout
          setTimeout(() => setLockout(false), 15 * 60 * 1000); 
        }
        return newFails;
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-mono selection:bg-[#1b4332] selection:text-[#d8f3dc]">
      <div className="max-w-md w-full relative">
        {/* Terminal decorative elements */}
        <div className="absolute -top-12 left-0 text-[#1b4332] text-xs uppercase flex items-center gap-2">
          <Terminal size={14} /> System Login
        </div>

        <div className="bg-[#0a0a0a] border border-[#1b4332] p-8 rounded-sm shadow-[0_0_40px_rgba(27,67,50,0.1)] relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
          
          <div className="flex justify-center mb-8">
            <div className="bg-[#050505] p-4 rounded-full border border-[#1b4332]">
              <Shield size={32} className="text-[#52b788]" />
            </div>
          </div>

          <h2 className="text-xl text-[#52b788] text-center mb-8 uppercase tracking-[0.3em] font-bold">
            Admin Auth
          </h2>

          {lockout ? (
            <div className="text-center text-red-500 py-12 animate-pulse uppercase tracking-widest font-bold">
              <Lock size={48} className="mx-auto mb-4" />
              LOCKOUT: 15 MINUTES
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1b4332] mb-2">Admin MD5 Key</label>
                <input
                  type="password"
                  required
                  value={formData.md5Key}
                  onChange={e => setFormData({...formData, md5Key: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-3 focus:outline-none focus:border-[#52b788] transition-colors font-mono"
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1b4332] text-[#d8f3dc] p-4 uppercase tracking-[0.2em] hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 font-bold mt-4"
              >
                {loading ? 'Authenticating...' : 'Authenticate'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
