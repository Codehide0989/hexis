import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Download, Filter, RefreshCw, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  // Filters
  const [searchAdmin, setSearchAdmin] = useState('');
  const [searchTarget, setSearchTarget] = useState('');

  useEffect(() => {
    fetchLogs();

    // Fast polling every 3 seconds (WebSockets are blocked by RLS since admin uses custom auth)
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const adminId = localStorage.getItem('admin_id');
      if (!adminId) return;

      const { data, error } = await supabase.rpc('admin_get_logs', { p_admin_id: adminId });

      if (error) throw error;

      // Since our robust SQL script returns a JSON array, `data` is directly our array!
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }

      setNewCount(0);
    } catch (e: any) {
      console.error(e);
      if (!isBackground) toast.error('Failed to load logs: ' + e.message);
    }
    if (!isBackground) setLoading(false);
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-blue-900/30 text-blue-500 border-blue-900';
    if (action.includes('CREATE')) return 'bg-green-900/30 text-green-500 border-green-900';
    if (action.includes('UPDATE')) return 'bg-yellow-900/30 text-yellow-500 border-yellow-900';
    if (action.includes('DELETE')) return 'bg-red-900/30 text-red-500 border-red-900';
    if (action.includes('BAN')) return 'bg-orange-900/30 text-orange-500 border-orange-900';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const filteredLogs = logs.filter(l => {
    const adminMatch = (l.admin_users?.username || l.username || '').toLowerCase().includes(searchAdmin.toLowerCase());
    const targetMatch = (l.target_type || '').toLowerCase().includes(searchTarget.toLowerCase()) ||
      (l.target_id || '').toLowerCase().includes(searchTarget.toLowerCase());
    return adminMatch && targetMatch;
  });

  const handleExport = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'Details'];
    const csvData = filteredLogs.map(l => [
      l.created_at,
      l.admin_users?.username || l.username || 'System',
      l.action,
      l.target_type,
      l.target_id,
      JSON.stringify(l.details || {})
    ].join(','));

    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hexis_admin_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Logs Exported');
  };

  return (
    <div className="font-mono text-[#d8f3dc] max-w-7xl mx-auto space-y-6">

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 rounded">
          <div className="text-xs text-[#52b788] uppercase tracking-widest mb-1">Total Logs</div>
          <div className="text-2xl text-[#74c69d] font-bold">{logs.length}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 rounded">
          <div className="text-xs text-[#52b788] uppercase tracking-widest mb-1">Logs Today</div>
          <div className="text-2xl text-[#74c69d] font-bold">
            {logs.filter(l => new Date(l.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))).length}
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 rounded md:col-span-2 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#52b788] uppercase tracking-widest mb-1">System Audit Status</div>
            <div className="text-sm text-[#d8f3dc] flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Logging Active
            </div>
          </div>
          <button onClick={() => fetchLogs()} className="flex items-center gap-2 px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] rounded uppercase tracking-widest text-xs transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1b4332]" size={16} />
          <input
            type="text" placeholder="Search Admin..."
            value={searchAdmin} onChange={e => setSearchAdmin(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1b4332] pl-10 pr-4 py-2 text-sm focus:border-[#74c69d] focus:outline-none"
          />
        </div>
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1b4332]" size={16} />
          <input
            type="text" placeholder="Search Target (Type or ID)..."
            value={searchTarget} onChange={e => setSearchTarget(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1b4332] pl-10 pr-4 py-2 text-sm focus:border-[#74c69d] focus:outline-none"
          />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-[#74c69d] text-[#74c69d] hover:bg-[#74c69d]/10 rounded uppercase tracking-widest text-xs transition-colors">
          <Download size={14} /> Export Logs
        </button>
      </div>

      {newCount > 0 && (
        <div className="bg-[#1b4332] text-[#d8f3dc] p-3 text-center text-xs tracking-widest uppercase rounded cursor-pointer animate-pulse" onClick={() => fetchLogs()}>
          {newCount} New Entries Detected — Click to load
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0a0a0a] border border-[#1b4332] rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1b4332]/20 border-b border-[#1b4332]">
            <tr>
              <th className="p-3"></th>
              <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Timestamp</th>
              <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Admin</th>
              <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Action</th>
              <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Target Type</th>
              <th className="p-3 text-xs tracking-widest text-[#52b788] font-normal uppercase">Target ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b4332]/50">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[#52b788] uppercase">Loading...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-[#1b4332] uppercase">No Logs Found</td></tr>
            ) : (
              filteredLogs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-[#1b4332]/10 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="p-3 text-[#1b4332]">
                      {expandedId === log.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="p-3">{format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}</td>
                    <td className="p-3">{log.admin_users?.username || log.username || 'System'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-[10px] tracking-widest font-bold uppercase border rounded-sm ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-[#52b788]">{log.target_type}</td>
                    <td className="p-3 text-[#52b788] text-xs">{log.target_id?.substring(0, 8)}...</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-[#050505] border-b border-[#1b4332]">
                      <td colSpan={6} className="p-4">
                        <div className="flex items-start gap-4 text-xs">
                          <Activity size={16} className="text-[#1b4332] mt-1" />
                          <div className="flex-1">
                            <div className="text-[#52b788] uppercase tracking-widest mb-2 font-bold">Action Payload Details</div>
                            <pre className="bg-[#0a0a0a] p-3 border border-[#1b4332] rounded text-[#d8f3dc] overflow-auto max-h-40">
                              {JSON.stringify(log.details || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
