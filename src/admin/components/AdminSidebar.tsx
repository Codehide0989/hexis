import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Megaphone,
  ScrollText,
  BarChart,
  Server,
  ExternalLink,
  LogOut,
  Terminal,
  X,
  CreditCard,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { adminLogout } from '../lib/adminAuth';
import { useState } from 'react';

interface AdminSidebarProps {
  isOpen?: boolean;
  setIsOpen?: (v: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (v: boolean) => void;
}

export default function AdminSidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: AdminSidebarProps) {
  const navigate = useNavigate();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'OVERVIEW', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'USERS', path: '/admin/users', icon: Users },
    { name: 'PLANS', path: '/admin/plans', icon: CreditCard },
    { name: 'MAINTENANCE', path: '/admin/maintenance', icon: Wrench },
    { name: 'SETTINGS', path: '/admin/settings', icon: Settings },
    { name: 'ANNOUNCEMENTS', path: '/admin/announcements', icon: Megaphone },
    { name: 'LOGS', path: '/admin/logs', icon: ScrollText },
    { name: 'ANALYTICS', path: '/admin/analytics', icon: BarChart },
    { name: 'SYSTEM', path: '/admin/system', icon: Server },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen && setIsOpen(false)}
      />

      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#050505] border-r border-[#1b4332] flex flex-col font-mono text-[#d8f3dc]
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        {/* Header */}
        <div className={`h-16 flex items-center border-b 
          border-[#1b4332] shrink-0 transition-all duration-300
          ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        
          <div className={`flex items-center gap-3 overflow-hidden
            transition-all duration-300
            ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <Terminal size={20} className="text-[#74c69d] shrink-0" />
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-lg font-bold tracking-[0.2em] 
                uppercase text-[#74c69d]">HEXIS</span>
              <span className="font-mono text-[9px] text-[#1b4332] 
                border border-[#1b4332] px-1.5 py-0.5 tracking-widest">
                ADMIN
              </span>
            </div>
          </div>
        
          <button
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center justify-center
              w-8 h-8 border border-[#1b4332] text-[#95d5b2]
              hover:text-[#52b788] hover:border-[#52b788]
              hover:bg-[#0d2818] transition-all duration-200
              ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed 
              ? <PanelLeftOpen size={14} /> 
              : <PanelLeftClose size={14} />}
          </button>
        
          <button className="lg:hidden text-[#52b788] p-1"
            onClick={() => setIsOpen && setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1b4332] [&::-webkit-scrollbar-track]:bg-transparent">
          {navItems.map(item => (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => isCollapsed && setHoveredNav(item.path)}
              onMouseLeave={() => isCollapsed && setHoveredNav(null)}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center
                  ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-[9px]'}
                  w-full font-mono text-xs uppercase tracking-wider
                  border-l-2 transition-all duration-150
                  ${isActive
                    ? 'border-[#74c69d] text-[#74c69d] bg-[#0d2818]'
                    : 'border-transparent text-[#95d5b2] hover:text-[#74c69d] hover:bg-[#0d2818]/50'
                  }
                `}
                onClick={() => setIsOpen && setIsOpen(false)}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={isCollapsed ? 18 : 15} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>

              {/* Tooltip for collapsed mode */}
              {isCollapsed && hoveredNav === item.path && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#0d2818] border border-[#1b4332] px-2 py-1 text-xs font-mono text-[#74c69d] whitespace-nowrap z-50 pointer-events-none rounded">
                  {item.name}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Toggle Button */}
        <div className="px-2 py-2">
          <button
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center text-[#52b788] hover:text-[#74c69d] hover:bg-[#0a0a0a] transition-colors rounded
              ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'w-full gap-3 px-3 py-2 text-sm tracking-widest uppercase'}
            `}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={18} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#1b4332] flex flex-col gap-2">
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center text-sm tracking-widest uppercase text-[#52b788] hover:bg-[#0a0a0a] hover:text-[#74c69d] transition-colors rounded
              ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2'}
            `}
            title={isCollapsed ? "View Site" : undefined}
          >
            <ExternalLink size={isCollapsed ? 20 : 18} className="shrink-0" />
            {!isCollapsed && <span className="truncate">View Site</span>}
          </a>
          <button
            onClick={handleLogout}
            className={`flex items-center text-sm tracking-widest uppercase text-red-500 hover:bg-[#200505] transition-colors rounded text-left
              ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2 w-full'}
            `}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={isCollapsed ? 20 : 18} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          {/* Version */}
          {!isCollapsed && (
            <div className="text-[10px] text-[#1b4332] text-center mt-2">
              v2.1
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
