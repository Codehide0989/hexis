import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Status from './pages/Status'
import Protocol from './pages/Protocol'
import Pricing from './pages/Pricing'
import AuthCallback from './pages/AuthCallback'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/modules/Tasks'
import Kanban from './pages/modules/Kanban'
import CalendarModule from './pages/modules/Calendar'
import TodosModule from './pages/modules/Todos'
import RemindersModule from './pages/modules/Reminders'
import FinanceModule from './pages/modules/Finance'
import InvoicesModule from './pages/modules/Invoices'
import Vault from './pages/modules/Vault'
import Docs from './pages/modules/Docs'
import Collab from './pages/modules/Collab'
import Analytics from './pages/modules/Analytics'
import Settings from './pages/modules/Settings'
import Plan from './pages/modules/Plan'

function PlaceholderModule({ name }: { name: string }) {
  return (
    <div className="mt-8 border border-[#1b4332] border-dashed p-12 flex items-center justify-center bg-[#0d2818] h-full">
      <div className="text-center font-mono">
        <div className="text-[#52b788] mb-2 uppercase">AWAITING MODULE DATA...</div>
        <div className="text-[#1b4332] text-xs uppercase">[ {name} VIEW ENCRYPTED ]</div>
      </div>
    </div>
  );
}

import PrivateRoute from './components/layout/PrivateRoute'
import Overview from './pages/modules/Overview'
import { PlanProvider } from './context/PlanContext'

import AdminSetup from './admin/pages/AdminSetup'
import AdminLogin from './admin/pages/AdminLogin'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminUsers from './admin/pages/AdminUsers'
import AdminPlans from './admin/pages/AdminPlans'
import AdminMaintenance from './admin/pages/AdminMaintenance'
import AdminSettings from './admin/pages/AdminSettings'
import AdminLogs from './admin/pages/AdminLogs'
import AdminAnnouncements from './admin/pages/AdminAnnouncements'
import AdminAnalytics from './admin/pages/AdminAnalytics'
import AdminSystem from './admin/pages/AdminSystem'
import AdminRoute from './admin/components/AdminRoute'
import AdminLayout from './admin/components/AdminLayout'
import { SettingsProvider, useSettings } from './lib/settings'
import Maintenance from './pages/Maintenance'
import Banned from './pages/Banned'

function AppRoutes() {
  const { settings, loading } = useSettings();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isBannedRoute = location.pathname === '/banned';
  const hasAdminSession = !!localStorage.getItem('admin_id');

  if (loading) {
    return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#74c69d] font-mono tracking-widest animate-pulse">INITIALIZING CORE SYSTEM...</div>;
  }

  // Check if maintenance mode is active AND not expired
  let isMaintenanceActive = settings?.maintenance_mode === true || String(settings?.maintenance_mode) === 'true';
  
  if (isMaintenanceActive && settings?.maintenance_eta) {
    const etaDate = new Date(settings.maintenance_eta).getTime();
    if (Date.now() >= etaDate) {
      isMaintenanceActive = false; // Auto-disable if ETA is passed
    }
  }

  if (isMaintenanceActive && !isAdminRoute && !isBannedRoute) {
    return <Maintenance message={settings?.maintenance_message} eta={settings?.maintenance_eta} />;
  }

  return (
    <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/status" element={<Status />} />
        <Route path="/protocol" element={<Protocol />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/banned" element={<Banned />} />
        <Route path="/auth/discord/callback" element={<AuthCallback />} />
        
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="maintenance" element={<AdminMaintenance />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="system" element={<AdminSystem />} />
        </Route>
        
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Overview />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="calendar" element={<CalendarModule />} />
          <Route path="invoices" element={<InvoicesModule />} />
          <Route path="finance" element={<FinanceModule />} />
          <Route path="todos" element={<TodosModule />} />
          <Route path="reminders" element={<RemindersModule />} />
          <Route path="collab" element={<Collab />} />
          <Route path="docs" element={<Docs />} />
          <Route path="vault" element={<Vault />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="plan" element={<Plan />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SettingsProvider>
        <PlanProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0d2818',
                color: '#d8f3dc',
                border: '1px solid #1b4332',
                fontFamily: '"Space Mono", monospace',
                fontSize: '12px',
              },
            }}
          />
          <AppRoutes />
        </PlanProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

export default App
