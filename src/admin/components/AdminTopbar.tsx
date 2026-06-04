import { useEffect, useState } from 'react';
import { getCurrentAdmin, AdminUser, adminLogout } from '../lib/adminAuth';
import { LogOut, Menu, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminTopbarProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileMenuOpen: boolean;
}

export default function AdminTopbar({ onMenuClick, isCollapsed, setIsCollapsed, isMobileMenuOpen }: AdminTopbarProps) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getCurrentAdmin().then(setAdmin);
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const pageTitle = location.pathname.split('/').pop()?.toUpperCase() || 'DASHBOARD';

  return (
    <header className="h-16 bg-[#0a0a0a] border-b border-[#1b4332] flex items-center justify-between px-4 md:px-6 font-mono text-[#d8f3dc] sticky top-0 z-30 transition-all duration-300">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile menu toggle */}
        <button 
          className="lg:hidden p-2 text-[#74c69d] hover:bg-[#1b4332] rounded transition-transform duration-300 transform" 
          onClick={onMenuClick}
        >
          {isMobileMenuOpen ? (
            <X size={20} className="rotate-90 transition-transform duration-300" />
          ) : (
            <Menu size={20} className="transition-transform duration-300" />
          )}
        </button>

        {/* Desktop sidebar toggle */}
        <button 
          className="hidden lg:flex p-1.5 text-[#52b788] hover:bg-[#1b4332] hover:text-[#74c69d] rounded transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className="flex items-center text-sm md:text-lg tracking-[0.1em] md:tracking-[0.2em] font-bold">
          <span className="text-[#52b788]">ADMIN</span>
          <span className="text-[#1b4332] mx-2 md:mx-3">&gt;</span>
          <span className="text-[#74c69d]">{pageTitle}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#050505] border border-[#1b4332] rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] tracking-widest uppercase text-green-500">Operational</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-[#050505] px-4 py-2 border border-[#1b4332] rounded">
          <span className="px-2 py-0.5 bg-red-900/50 text-red-500 border border-red-900 text-[10px] tracking-widest uppercase font-bold rounded-sm">
            Admin Mode
          </span>
          <span className="text-sm tracking-widest text-[#74c69d]">{admin?.username}</span>
        </div>
      </div>
    </header>
  );
}
