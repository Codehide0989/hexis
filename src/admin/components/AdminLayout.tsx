import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-[#1b4332] selection:text-[#d8f3dc]">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative transition-all duration-300 ease-in-out">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-10 z-0" />
        
        <AdminTopbar 
          onMenuClick={() => setSidebarOpen(true)} 
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
          isMobileMenuOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#050505] relative z-10 w-full transition-all duration-300">
          <div key={location.pathname} className="animate-in fade-in duration-300 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
