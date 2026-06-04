import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Terminal, ChevronRight } from 'lucide-react';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('username').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // For responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const commandResults = [
    { name: 'Go to Tasks', path: '/dashboard/tasks', type: 'page' },
    { name: 'Go to Calendar', path: '/dashboard/calendar', type: 'page' },
    { name: 'Go to Vault', path: '/dashboard/vault', type: 'page' },
    { name: 'Go to Docs', path: '/dashboard/docs', type: 'page' },
    { name: 'Go to Collab', path: '/dashboard/collab', type: 'page' },
    { name: 'Go to Analytics', path: '/dashboard/analytics', type: 'page' },
    { name: 'Go to Settings', path: '/dashboard/settings', type: 'page' },
  ].filter(res => res.name.toLowerCase().includes(commandSearch.toLowerCase()));

  return (
    <div className="bg-[var(--color-bg,#0a1a0f)] h-screen flex font-sans relative overflow-hidden transition-colors duration-500">
      {/* Grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--color-border,#1b4332)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border,#1b4332)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]"></div>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed md:relative z-50 h-screen transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar isOpen={isSidebarOpen} profile={profile} toggleSidebar={toggleSidebar} />
      </div>

      <main className="flex-1 flex flex-col z-10 h-screen overflow-hidden min-w-0">
        <Topbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} profile={profile} />
        
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto h-full min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Command Palette */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommandPaletteOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--color-surface,#0d2818)] border border-[var(--color-primary,#52b788)] shadow-[0_0_20px_rgba(82,183,136,0.15)] w-full max-w-xl flex flex-col font-mono"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border,#1b4332)]">
                <Terminal className="w-5 h-5 text-[var(--color-primary,#52b788)]" />
                <input 
                  autoFocus
                  type="text"
                  value={commandSearch}
                  onChange={e => setCommandSearch(e.target.value)}
                  placeholder="Type a command or search... (ESC to close)"
                  className="flex-1 bg-transparent border-none text-[var(--color-primary,#52b788)] focus:outline-none placeholder:text-[var(--color-primary,#52b788)]/40"
                />
                <button onClick={() => setIsCommandPaletteOpen(false)} className="text-[var(--color-primary,#52b788)]/50 hover:text-[var(--color-primary,#52b788)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {commandResults.length === 0 ? (
                  <div className="p-4 text-center text-[var(--color-primary,#52b788)]/50 text-sm">
                    NO_RESULTS_FOUND
                  </div>
                ) : (
                  commandResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(res.path);
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 text-left text-[var(--color-primary,#52b788)] hover:bg-[var(--color-primary,#52b788)] hover:text-[var(--color-bg,#0a1a0f)] transition-colors group"
                    >
                      <span>{res.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-[var(--color-border,#1b4332)] p-2 text-xs text-center text-[var(--color-primary,#52b788)]/50">
                Use <kbd className="bg-[var(--color-border,#1b4332)] px-1 py-0.5 rounded-sm mx-1">↑</kbd> <kbd className="bg-[var(--color-border,#1b4332)] px-1 py-0.5 rounded-sm mx-1">↓</kbd> to navigate, <kbd className="bg-[var(--color-border,#1b4332)] px-1 py-0.5 rounded-sm mx-1">ENTER</kbd> to select
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
