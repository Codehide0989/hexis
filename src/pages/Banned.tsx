import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Banned() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-mono selection:bg-red-900 selection:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-10" />
      
      <div className="max-w-md w-full bg-[#0a0a0a] border border-red-900 rounded p-8 text-center space-y-6 relative overflow-hidden z-10 shadow-[0_0_50px_rgba(220,38,38,0.15)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse" />
        
        <div className="flex justify-center">
          <ShieldAlert size={64} className="text-red-500" />
        </div>
        
        <h1 className="text-2xl text-red-500 font-bold uppercase tracking-[0.2em]">Access Denied</h1>
        
        <div className="space-y-4">
          <p className="text-[#d8f3dc] text-sm leading-relaxed">
            Your account has been permanently restricted by a system administrator due to a violation of operational protocols.
          </p>
          <p className="text-red-400 text-xs uppercase tracking-widest">
            Error Code: 403_BANNED
          </p>
        </div>

        <div className="pt-6 border-t border-red-900/50">
          <Link to="/" className="inline-block w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-500 px-6 py-3 font-bold uppercase tracking-widest transition-colors rounded">
            Return to Surface
          </Link>
        </div>
      </div>
    </div>
  );
}
