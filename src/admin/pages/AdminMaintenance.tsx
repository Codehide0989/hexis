import { useState, useEffect } from 'react';
import { ShieldAlert, Zap, Clock, MessageSquare, History, Activity, ExternalLink, Power, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../lib/settings';
import { logAdminAction } from '../lib/adminAuth';
import toast from 'react-hot-toast';

export default function AdminMaintenance() {
  const { settings, updateSetting } = useSettings();
  
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (settings) {
      let active = !!settings.maintenance_mode;
      if (active && settings.maintenance_eta) {
        if (Date.now() >= new Date(settings.maintenance_eta).getTime()) {
          active = false; // Auto-disabled because time passed
        }
      }
      setIsMaintenance(active);
      setMessage(settings.maintenance_message || '');
      setEta(settings.maintenance_eta ? new Date(settings.maintenance_eta).toISOString().slice(0, 16) : '');
    }
    fetchStats();
  }, [settings]);

  const fetchStats = async () => {
    const adminId = localStorage.getItem('admin_id');
    if (!adminId) return;

    // Fetch online users (last 15 mins)
    try {
      const { data: profiles } = await supabase.rpc('admin_get_profiles', { p_admin_id: adminId });
      if (profiles) {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const online = profiles.filter((p: any) => new Date(p.last_seen) > fifteenMinsAgo).length;
        setOnlineCount(online);
      }

      // Fetch maintenance logs
      const { data: logData } = await supabase.rpc('admin_get_logs', { p_admin_id: adminId });
      if (logData && Array.isArray(logData)) {
        setLogs(logData.filter((l: any) => l.action === 'MAINTENANCE_MODE').slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBroadcast = async () => {
    setSaving(true);
    const adminId = localStorage.getItem('admin_id');
    
    // Save to settings
    const etaISO = eta ? new Date(eta).toISOString() : '';
    await updateSetting('maintenance_mode', true);
    await updateSetting('maintenance_message', message);
    await updateSetting('maintenance_eta', etaISO);
    
    // Log action
    await logAdminAction(adminId!, 'MAINTENANCE_MODE', 'system', 'global', { enabled: true, message, eta: etaISO });
    
    setIsMaintenance(true);
    toast.success('MAINTENANCE MODE ACTIVATED');
    setSaving(false);
    fetchStats();
  };

  const handleDeactivate = async () => {
    setSaving(true);
    const adminId = localStorage.getItem('admin_id');
    
    await updateSetting('maintenance_mode', false);
    await logAdminAction(adminId!, 'MAINTENANCE_MODE', 'system', 'global', { enabled: false });
    
    setIsMaintenance(false);
    toast.success('SYSTEM RESTORED TO NORMAL OPERATION');
    setSaving(false);
    fetchStats();
  };

  const setPresetEta = (hours: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + hours * 60);
    setEta(d.toISOString().slice(0, 16));
  };

  const MSG_TEMPLATES = [
    "Scheduled System Update",
    "Emergency Database Fix",
    "Security Patch Deployment",
    "Server Infrastructure Migration"
  ];

  return (
    <div className="font-mono text-[#d8f3dc] max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-[#74c69d] flex items-center gap-3">
            <ShieldAlert size={28} /> Maintenance Control
          </h1>
          <p className="text-xs sm:text-sm text-[#52b788] mt-1">Manage system lockouts and public status pages</p>
        </div>
        <a 
          href="/maintenance" 
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border border-[#1b4332] hover:bg-[#1b4332]/50 rounded uppercase tracking-widest text-xs transition-colors w-full sm:w-auto justify-center"
        >
          <ExternalLink size={14} /> Preview Page
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Master Control */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Toggle Card */}
          <div className={`p-8 rounded border-2 relative overflow-hidden transition-colors ${isMaintenance ? 'bg-yellow-900/10 border-yellow-600' : 'bg-[#0a0a0a] border-[#1b4332]'}`}>
            {isMaintenance && <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse" />}
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${isMaintenance ? 'bg-yellow-500 shadow-[0_0_10px_#eab308] animate-pulse' : 'bg-[#1b4332]'}`} />
                  <h2 className={`text-xl font-bold tracking-widest uppercase ${isMaintenance ? 'text-yellow-500' : 'text-[#52b788]'}`}>
                    {isMaintenance ? 'SYSTEM LOCKED' : 'SYSTEM OPERATIONAL'}
                  </h2>
                </div>
                <p className="text-sm text-[#52b788]">
                  {isMaintenance 
                    ? 'All non-admin traffic is currently being redirected to the maintenance portal.'
                    : 'The system is open. Normal traffic is flowing.'}
                </p>
              </div>

              {isMaintenance ? (
                <button 
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="w-full md:w-auto bg-[#1b4332] hover:bg-[#2d6a4f] text-white px-8 py-4 uppercase tracking-widest font-bold flex items-center justify-center gap-3 transition-colors rounded"
                >
                  <Power size={20} /> Deactivate Maintenance
                </button>
              ) : (
                <button 
                  onClick={handleBroadcast}
                  disabled={saving || !message}
                  className={`w-full md:w-auto px-8 py-4 uppercase tracking-widest font-bold flex items-center justify-center gap-3 transition-colors rounded ${message ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  <Zap size={20} /> Broadcast & Lock System
                </button>
              )}
            </div>

            {/* Warning active visitors */}
            {!isMaintenance && (
              <div className="mt-6 p-4 bg-[#1b4332]/20 border border-[#1b4332] rounded flex items-center gap-3 text-sm text-[#74c69d]">
                <Activity size={16} className="text-yellow-500 animate-pulse" />
                <span><strong className="text-white">{onlineCount}</strong> users active in the last 15 mins. Activating will force-redirect them instantly.</span>
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="bg-[#0a0a0a] border border-[#1b4332] rounded p-6">
            <h3 className="text-[#74c69d] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
              <Settings size={18} /> Configuration Parameters
            </h3>
            
            <div className="space-y-6">
              {/* Message */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-xs uppercase tracking-widest text-[#52b788] flex items-center gap-2">
                    <MessageSquare size={14} /> Display Message (Required)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MSG_TEMPLATES.map((t, i) => (
                      <button key={i} onClick={() => setMessage(t)} className="text-[10px] bg-[#1b4332]/30 hover:bg-[#1b4332] text-[#52b788] px-2 py-1 rounded transition-colors uppercase whitespace-nowrap">
                        {t.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Enter reason for maintenance..."
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  disabled={isMaintenance}
                  className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-yellow-600 focus:outline-none disabled:opacity-50" 
                />
              </div>

              {/* ETA */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-xs uppercase tracking-widest text-[#52b788] flex items-center gap-2">
                    <Clock size={14} /> Estimated End Time (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPresetEta(0.5)} disabled={isMaintenance} className="text-[10px] bg-[#1b4332]/30 hover:bg-[#1b4332] text-[#52b788] px-2 py-1 rounded transition-colors disabled:opacity-50 whitespace-nowrap">30 MIN</button>
                    <button onClick={() => setPresetEta(1)} disabled={isMaintenance} className="text-[10px] bg-[#1b4332]/30 hover:bg-[#1b4332] text-[#52b788] px-2 py-1 rounded transition-colors disabled:opacity-50 whitespace-nowrap">1 HR</button>
                    <button onClick={() => setPresetEta(2)} disabled={isMaintenance} className="text-[10px] bg-[#1b4332]/30 hover:bg-[#1b4332] text-[#52b788] px-2 py-1 rounded transition-colors disabled:opacity-50 whitespace-nowrap">2 HR</button>
                  </div>
                </div>
                <input 
                  type="datetime-local" 
                  value={eta} 
                  onChange={e => setEta(e.target.value)} 
                  disabled={isMaintenance}
                  className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-yellow-600 focus:outline-none disabled:opacity-50" 
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            
            {isMaintenance && (
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-900/50 rounded">
                <p className="text-xs text-yellow-600 uppercase tracking-widest">Note: To modify these parameters, you must deactivate maintenance mode first, update the values, and then broadcast again.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: History */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] rounded p-6 h-fit">
          <h3 className="text-[#74c69d] font-bold tracking-widest uppercase mb-6 flex items-center gap-2 border-b border-[#1b4332] pb-4">
            <History size={18} /> Event Log
          </h3>
          
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-xs text-[#1b4332] text-center uppercase tracking-widest py-8">
                NO MAINTENANCE HISTORY
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-l-2 border-[#1b4332] pl-3 py-1">
                  <div className="text-[10px] text-[#52b788] mb-1">
                    {new Date(log.created_at).toLocaleString()} by {log.username}
                  </div>
                  <div className="text-xs text-[#d8f3dc]">
                    {log.details?.enabled ? (
                      <span className="text-yellow-500">ACTIVATED</span>
                    ) : (
                      <span className="text-green-500">DEACTIVATED</span>
                    )}
                  </div>
                  {log.details?.enabled && (
                    <div className="text-[10px] text-gray-500 mt-1 truncate">
                      "{log.details.message}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
