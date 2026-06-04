import { useState } from 'react';
import { Bell, Search, Lock, PanelLeftClose, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

interface TopbarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  profile: { username: string } | null;
}

export default function Topbar({ toggleSidebar, isSidebarOpen, profile }: TopbarProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const location = useLocation();
  const path = location.pathname;
  
  let moduleName = 'OVERVIEW';
  if (path !== '/dashboard') {
    moduleName = path.split('/').pop()?.replace(/-/g, ' ').toUpperCase() || 'OVERVIEW';
  }

  const username = profile?.username || 'OP';
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <header className="h-14 bg-[#0a1a0f] border-b border-[#1b4332] flex items-center px-3 md:px-6 gap-3 sticky top-0 z-30">
      {/* SLOT 1 — Mobile hamburger (hidden on desktop) */}
      <button 
        className="block md:hidden text-[#52b788] p-1.5 hover:bg-[#0d2818] flex-shrink-0"
        onClick={toggleSidebar}>
        <Menu size={18} />
      </button>

      {/* SLOT 2 — Sidebar collapse toggle (desktop only) */}
      <button 
        onClick={toggleSidebar}
        className="hidden md:flex text-[#95d5b2] p-1.5 hover:bg-[#0d2818] hover:text-[#52b788] flex-shrink-0">
        <PanelLeftClose size={16} />
      </button>

      {/* SLOT 3 — Page title area */}
      <div className="flex flex-col min-w-0 flex-shrink">
        <div className="flex items-center gap-2">
          <span className="text-[#52b788] font-mono text-xs hidden sm:block">&gt;</span>
          <h1 className="font-mono font-bold text-sm md:text-base text-[#d8f3dc] uppercase tracking-wider truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
            {moduleName}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
          <Lock size={10} className="text-[#52b788]" />
          <span className="font-mono text-[9px] text-[#52b788] tracking-widest">
            ENCRYPTED_CHANNEL
          </span>
        </div>
      </div>

      {/* SLOT 4 — Spacer */}
      <div className="flex-1" />

      {/* SLOT 5 — Search (hidden on mobile) */}
      <button
        onClick={() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true
            })
          );
        }}
        className="hidden md:flex items-center gap-2 bg-[#0d2818] border border-[#1b4332] px-3 py-2 w-48 lg:w-64 hover:border-[#52b788] transition-colors cursor-pointer group"
      >
        <Search size={12} className="text-[#52b788] flex-shrink-0" />
        <span className="font-mono text-xs text-[#2d6a4f] group-hover:text-[#52b788] transition-colors">
          QUERY INDEX...
        </span>
        <span className="ml-auto font-mono text-[10px] text-[#1b4332] border border-[#1b4332] px-1.5 py-0.5 group-hover:border-[#52b788] group-hover:text-[#52b788] transition-colors hidden lg:block">
          Ctrl+K
        </span>
      </button>

      {/* SLOT 6 — Right actions */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        
        {/* Notification bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-1.5 text-[#95d5b2] hover:text-[#52b788] transition-colors">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#e63946] rounded-full flex items-center justify-center font-mono text-[9px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {showNotifDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)}></div>
              <div className="absolute right-0 top-10 w-80 bg-[#0d2818] border border-[#52b788] z-50 shadow-lg max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b4332]">
                  <span className="font-mono text-xs text-[#52b788] uppercase tracking-widest">
                    NOTIFICATIONS
                  </span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllRead}
                      className="font-mono text-[10px] text-[#95d5b2] hover:text-[#52b788]">
                      MARK ALL READ
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center font-mono text-xs text-[#1b4332]">
                    NO_NOTIFICATIONS
                  </div>
                ) : notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markRead(notif.id);
                      if (notif.type === 'announcement') {
                        setSelectedAnnouncement(notif);
                      } else if (notif.type === 'doc_invite') {
                        navigate('/dashboard/docs');
                      } else if (notif.type === 'collab_invite') {
                        navigate('/dashboard/collab');
                      }
                      setShowNotifDropdown(false);
                    }}
                    className={`px-4 py-3 border-b border-[#1b4332] cursor-pointer hover:bg-[#0a1a0f] transition-colors ${!notif.read ? 'bg-[#0a1a0f]' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 bg-[#52b788] rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-[#d8f3dc] font-bold truncate">
                          {notif.title}
                        </p>
                        <p className="font-sans text-xs text-[#95d5b2] mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="font-mono text-[10px] text-[#1b4332] mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
      </div>

      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-mono">
          <div className={`bg-[#0a0a0a] border rounded w-full max-w-lg p-6 space-y-4 ${
            selectedAnnouncement.announcementType === 'warning' ? 'border-yellow-900' :
            selectedAnnouncement.announcementType === 'danger' ? 'border-red-900' :
            'border-blue-900'
          }`}>
            <h3 className={`text-lg uppercase tracking-widest font-bold ${
              selectedAnnouncement.announcementType === 'warning' ? 'text-yellow-500' :
              selectedAnnouncement.announcementType === 'danger' ? 'text-red-500' :
              'text-blue-500'
            }`}>
              {selectedAnnouncement.title}
            </h3>
            <p className="text-[#d8f3dc] text-sm whitespace-pre-wrap leading-relaxed">
              {selectedAnnouncement.message}
            </p>
            <p className="text-[#52b788] text-xs">
              Broadcasted: {new Date(selectedAnnouncement.created_at).toLocaleString()}
            </p>
            <div className="pt-4 border-t border-[#1b4332]">
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] py-2 uppercase tracking-widest font-bold text-xs transition-colors"
              >
                Close Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
