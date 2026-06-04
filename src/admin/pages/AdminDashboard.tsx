import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Users, Database, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    bannedUsers: 0,
    totalTasks: 0,
    totalDocs: 0,
    totalInvoices: 0,
    storageUsed: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [ping, setPing] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
    measurePing();

    // Fallback to polling every 5 seconds since Realtime is blocked by RLS
    const interval = setInterval(() => {
      fetchDashboardData();
      measurePing();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const measurePing = async () => {
    const start = performance.now();
    try {
      await supabase.from('profiles').select('id').limit(1);
    } catch(e) {}
    setPing(Math.round(performance.now() - start));
  };

  const fetchDashboardData = async () => {
    try {
      const adminId = localStorage.getItem('admin_id');
      if (!adminId) return;

      const { data, error } = await supabase.rpc('admin_get_dashboard_stats', { p_admin_id: adminId });
      
      if (error) throw error;
      if (!data) return;

      setStats({
        totalUsers: data.totalUsers || 0,
        activeToday: data.activeToday || 0,
        newThisWeek: data.newThisWeek || 0,
        bannedUsers: data.bannedUsers || 0,
        totalTasks: data.totalTasks || 0,
        totalDocs: data.totalDocs || 0,
        totalInvoices: data.totalInvoices || 0,
        storageUsed: data.storageUsed || 0
      });

      setLogs(data.logs || []);
      setAnnouncements(data.announcements || []);

    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('BAN')) return 'text-red-500';
    if (action.includes('CREATE')) return 'text-[#74c69d]';
    if (action.includes('UPDATE')) return 'text-yellow-500';
    if (action.includes('LOGIN')) return 'text-blue-500';
    return 'text-[#52b788]';
  };

  return (
    <div className="font-mono text-[#d8f3dc] max-w-7xl mx-auto space-y-8">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL USERS', value: stats.totalUsers, icon: Users },
          { label: 'ACTIVE TODAY', value: stats.activeToday, icon: Activity },
          { label: 'NEW THIS WEEK', value: stats.newThisWeek, icon: Users },
          { label: 'BANNED USERS', value: stats.bannedUsers, icon: ShieldAlert, color: 'text-red-500' },
          { label: 'TOTAL TASKS', value: stats.totalTasks, icon: CheckCircle2 },
          { label: 'TOTAL DOCS', value: stats.totalDocs, icon: FileText },
          { label: 'TOTAL INVOICES', value: stats.totalInvoices, icon: FileText },
          { label: 'STORAGE USED', value: formatBytes(stats.storageUsed), icon: Database },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded relative overflow-hidden group hover:border-[#74c69d] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs tracking-widest text-[#52b788] uppercase">{stat.label}</span>
              <stat.icon size={16} className={`opacity-50 ${stat.color || 'text-[#1b4332] group-hover:text-[#74c69d]'}`} />
            </div>
            <div className={`text-3xl font-bold ${stat.color || 'text-[#74c69d]'}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm tracking-widest text-[#74c69d] uppercase border-b border-[#1b4332] pb-2">Recent Activity</h2>
          <div className="bg-[#0a0a0a] border border-[#1b4332] rounded overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1b4332]/20 border-b border-[#1b4332]">
                <tr>
                  <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Time</th>
                  <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Admin</th>
                  <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Action</th>
                  <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b4332]/50">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-[#1b4332] uppercase text-xs">No Recent Logs (Or RLS Blocked)</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#1b4332]/10 transition-colors">
                    <td className="p-3 text-[#d8f3dc]">{format(new Date(log.created_at), 'MMM dd HH:mm:ss')}</td>
                    <td className="p-3 text-[#d8f3dc]">{log.admin_users?.username || 'System'}</td>
                    <td className={`p-3 font-bold ${getActionColor(log.action)}`}>{log.action}</td>
                    <td className="p-3 text-[#d8f3dc]">{log.target_type}: {log.target_id?.substring(0,8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health & Announcements */}
        <div className="space-y-8">
          
          <div className="space-y-4">
            <h2 className="text-sm tracking-widest text-[#74c69d] uppercase border-b border-[#1b4332] pb-2">System Health</h2>
            <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs tracking-widest text-[#52b788] uppercase">Supabase Connection</span>
                <span className="text-xs text-green-500 font-bold uppercase">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs tracking-widest text-[#52b788] uppercase">Database Latency</span>
                <span className="text-xs text-[#d8f3dc] font-bold">{ping}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs tracking-widest text-[#52b788] uppercase">Last Backup</span>
                <span className="text-xs text-[#d8f3dc] font-bold uppercase">Today 00:00 UTC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs tracking-widest text-[#52b788] uppercase">App Version</span>
                <span className="text-xs text-[#d8f3dc] font-bold">1.0.0</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm tracking-widest text-[#74c69d] uppercase border-b border-[#1b4332] pb-2">Active Announcements</h2>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded text-center text-[#1b4332] uppercase text-xs">
                  No active announcements
                </div>
              ) : announcements.map(ann => (
                <div key={ann.id} className={`bg-[#0a0a0a] border p-4 rounded ${
                  ann.type === 'danger' ? 'border-red-900' : 
                  ann.type === 'warning' ? 'border-yellow-900' : 'border-[#1b4332]'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm tracking-widest uppercase text-[#d8f3dc]">{ann.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 uppercase tracking-widest border rounded-sm ${
                      ann.type === 'danger' ? 'text-red-500 border-red-900 bg-red-900/20' : 
                      ann.type === 'warning' ? 'text-yellow-500 border-yellow-900 bg-yellow-900/20' : 
                      'text-blue-500 border-blue-900 bg-blue-900/20'
                    }`}>{ann.type}</span>
                  </div>
                  <p className="text-xs text-[#52b788]">{ann.message}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
