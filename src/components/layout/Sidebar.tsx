import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../context/PlanContext';
import {
  Home, CheckSquare, Layout, Calendar,
  FileText, TrendingUp, List, Bell, Users, BookOpen,
  Lock, BarChart2, Settings, LogOut, X, Crown, Network
} from 'lucide-react';
import { HexisLogo } from '../ui/HexisLogo';

const navItems = [
  { name: 'OVERVIEW', path: '/dashboard', icon: Home },
  { name: 'TASKS', path: '/dashboard/tasks', icon: CheckSquare },
  { name: 'KANBAN', path: '/dashboard/kanban', icon: Layout },
  { name: 'CALENDAR', path: '/dashboard/calendar', icon: Calendar },
  { name: 'INVOICES', path: '/dashboard/invoices', icon: FileText },
  { name: 'FINANCE', path: '/dashboard/finance', icon: TrendingUp },
  { name: 'TODOS', path: '/dashboard/todos', icon: List },
  { name: 'REMINDERS', path: '/dashboard/reminders', icon: Bell },
  { name: 'COLLAB', path: '/dashboard/collab', icon: Users },
  { name: 'DOCS', path: '/dashboard/docs', icon: BookOpen },
  { name: 'VAULT', path: '/dashboard/vault', icon: Lock },
  { name: 'ANALYTICS', path: '/dashboard/analytics', icon: BarChart2 },
  { name: 'PLAN', path: '/dashboard/plan', icon: Crown },
  { name: 'MINDMAP', path: '/dashboard/mindmap', icon: Network },
  { name: 'SETTINGS', path: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  profile: { username: string } | null;
  toggleSidebar?: () => void;
}

export default function Sidebar({ isOpen, profile, toggleSidebar }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUse } = usePlan();
  const [activeReminders, setActiveReminders] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('remind_at', new Date().toISOString());
      
      setActiveReminders(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`sidebar-reminders-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reminders', 
          filter: `user_id=eq.${user.id}` 
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const username = profile?.username || 'OPERATOR_01';
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <>
      <aside className={`
        ${isOpen ? 'w-[195px]' : 'w-[72px]'}
        bg-[#0d2818] border-r border-[#1b4332] 
        flex flex-col shrink-0 h-full 
        transition-[width] duration-300 ease-in-out
        fixed md:relative z-50 md:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* HEADER — h-14 matches topbar */}
        <div className={`
          h-14 border-b border-[#1b4332] 
          flex items-center shrink-0
          ${isOpen ? 'justify-between px-4' : 'justify-center px-0'}
        `}>
          {isOpen ? (
            <>
              <HexisLogo size={26} showText={false} />
              <div className="flex items-center gap-1">
                <button 
                  onClick={toggleSidebar} 
                  className="md:hidden text-[#52b788] p-1">
                  <X size={18} />
                </button>
              </div>
            </>
          ) : (
            <HexisLogo size={26} showText={false} />
          )}
        </div>

        {/* NAV ITEMS */}
        <nav className="flex-1 flex flex-col justify-between py-2">
          <div className="flex flex-col flex-1">
            {navItems.map(({ name, path, icon: Icon }) => {
              const requiresPaidPlan = ['ANALYTICS', 'FINANCE', 'INVOICES', 'COLLAB', 'MINDMAP'].includes(name);
              const isLocked = requiresPaidPlan && !canUse(name.toLowerCase() as any);
              return (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                onClick={() => {
                  if (window.innerWidth < 768 && toggleSidebar) {
                    toggleSidebar();
                  }
                }}
                className={({ isActive }) => `
                  flex items-center flex-1
                  ${isOpen ? 'gap-3 px-[14px]' : 'justify-center px-0'}
                  font-mono text-xs uppercase tracking-wider
                  border-l-2 transition-colors duration-150 relative group/link
                  min-h-[38px]
                  ${isActive 
                    ? 'border-[#52b788] text-[#52b788] bg-[#0a1a0f]' 
                    : 'border-transparent text-[#95d5b2] hover:text-[#52b788] hover:bg-[#0a1a0f]/50'
                  }
                  ${isLocked ? 'opacity-60' : ''}
                `}
              >
              <div className="relative flex-shrink-0">
                <Icon size={isOpen ? 16 : 18} />
                {/* Reminder badge */}
                {name === 'REMINDERS' && activeReminders > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e63946] rounded-full flex items-center justify-center font-mono text-[9px] text-white font-bold">
                    {activeReminders > 9 ? '9+' : activeReminders}
                  </span>
                )}
              </div>
              {isOpen && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{name}</span>
                  {isLocked && <Lock size={12} className="text-[#1b4332] ml-2 flex-shrink-0" />}
                </div>
              )}
              
              {/* Tooltip for collapsed state */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#0a1a0f] border border-[#1b4332] text-[#52b788] font-mono text-[10px] uppercase tracking-widest opacity-0 group-hover/link:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity flex items-center gap-2 hidden md:flex">
                  {name}
                  {isLocked && <Lock size={10} className="text-[#1b4332]" />}
                  {name === 'REMINDERS' && activeReminders > 0 && (
                    <span className="bg-[#e63946] text-[#0a1a0f] px-1 py-0.5 rounded-sm leading-none">
                      {activeReminders}
                    </span>
                  )}
                </div>
              )}
              </NavLink>
            )})}
          </div>
        </nav>

        {/* BOTTOM USER SECTION */}
        <div className="border-t border-[#1b4332] p-3 shrink-0">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#1b4332] border border-[#52b788] flex items-center justify-center font-mono font-bold text-xs text-[#52b788] flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-[#d8f3dc] truncate leading-tight">
                    {username}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-[#52b788]' : 'bg-[#e63946]'}`} />
                    <span className="font-mono text-[10px] text-[#52b788] truncate">
                      {isOnline ? 'STATUS: CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-1.5 border border-[#e63946] text-[#e63946] font-mono text-xs uppercase tracking-wider hover:bg-[#e63946] hover:text-[#0a1a0f] transition-colors"
              >
                <LogOut size={14} />
                DISCONNECT
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1b4332] border border-[#52b788] flex items-center justify-center font-mono font-bold text-xs text-[#52b788]">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#e63946] hover:bg-[#e63946]/10 transition-colors relative group/logout"
              >
                <LogOut size={16} />
                <div className="absolute left-full ml-3 px-2 py-1 bg-[#1a0000] border border-[#e63946] text-[#e63946] font-mono text-[10px] uppercase tracking-widest opacity-0 group-hover/logout:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden md:block">
                   DISCONNECT
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
