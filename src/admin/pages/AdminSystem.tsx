import { useState, useEffect } from 'react';
import { Server, Activity, Database, HardDrive, Cpu, Terminal, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSystem() {
  const [loading, setLoading] = useState(false);

  // Mock live data for the system panel
  const [sysData, setSysData] = useState({
    cpu: 24,
    ram: 45,
    storage: 12,
    dbConnections: 124,
    uptime: '14d 05h 12m',
    version: '1.4.2_stable',
    status: 'OPTIMAL'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSysData(prev => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() * 4 - 2))),
        dbConnections: Math.floor(Math.max(50, Math.min(300, prev.dbConnections + (Math.random() * 20 - 10))))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const runDiagnostic = () => {
    setLoading(true);
    toast.loading('Running full system diagnostic...', { id: 'diag' });
    setTimeout(() => {
      toast.success('Diagnostic complete. All systems nominal.', { id: 'diag' });
      setLoading(false);
    }, 2500);
  };

  const flushCache = () => {
    toast.loading('Flushing Redis cache...', { id: 'cache' });
    setTimeout(() => {
      toast.success('Cache flushed successfully (freed 412MB).', { id: 'cache' });
    }, 1500);
  };

  const restartServices = () => {
    if (confirm('WARNING: Restarting edge services will cause a 2-5 second downtime for active users. Proceed?')) {
      toast.loading('Restarting Edge Nodes...', { id: 'restart' });
      setTimeout(() => {
        toast.success('Edge Nodes restarted successfully.', { id: 'restart' });
      }, 3000);
    }
  };

  return (
    <div className="font-mono text-[#d8f3dc] max-w-7xl mx-auto space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold flex items-center gap-2">
          <Server /> System Diagnostics
        </h2>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-xs text-green-500 uppercase tracking-widest bg-[#1b4332]/30 px-3 py-1.5 rounded border border-green-900">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {sysData.status}
          </span>
          <button onClick={runDiagnostic} disabled={loading} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-4 py-2 uppercase tracking-widest text-xs font-bold transition-colors rounded">
            {loading ? 'Analyzing...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* CORE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CPU */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#1b4332]">
            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${sysData.cpu}%` }} />
          </div>
          <div className="flex justify-between items-start mb-2 mt-2">
            <span className="text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
              <Cpu size={14} /> CPU Load
            </span>
            <span className="text-xs text-[#52b788]">Core 0-15</span>
          </div>
          <div className="text-3xl font-bold text-[#74c69d]">{sysData.cpu.toFixed(1)}%</div>
        </div>

        {/* RAM */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#1b4332]">
            <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${sysData.ram}%` }} />
          </div>
          <div className="flex justify-between items-start mb-2 mt-2">
            <span className="text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
              <Activity size={14} /> Memory
            </span>
            <span className="text-xs text-[#52b788]">32 GB</span>
          </div>
          <div className="text-3xl font-bold text-[#74c69d]">{sysData.ram.toFixed(1)}%</div>
        </div>

        {/* STORAGE */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#1b4332]">
            <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${sysData.storage}%` }} />
          </div>
          <div className="flex justify-between items-start mb-2 mt-2">
            <span className="text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
              <HardDrive size={14} /> Disk I/O
            </span>
            <span className="text-xs text-[#52b788]">NVMe</span>
          </div>
          <div className="text-3xl font-bold text-[#74c69d]">{sysData.storage.toFixed(1)}%</div>
        </div>

        {/* DATABASE */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-5 rounded relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#1b4332]">
            <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(sysData.dbConnections / 500) * 100}%` }} />
          </div>
          <div className="flex justify-between items-start mb-2 mt-2">
            <span className="text-xs tracking-widest text-[#52b788] uppercase flex items-center gap-2">
              <Database size={14} /> DB Pool
            </span>
            <span className="text-xs text-[#52b788]">Max: 500</span>
          </div>
          <div className="text-3xl font-bold text-[#74c69d]">{sysData.dbConnections}</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SERVER INFO */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-6 rounded space-y-4">
          <h3 className="text-xs tracking-widest text-[#74c69d] font-bold uppercase mb-4 border-b border-[#1b4332] pb-2">Environment Details</h3>

          <div className="flex justify-between items-center text-sm">
            <span className="text-[#52b788]">Node Version</span>
            <span>v20.9.0</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#52b788]">Hexis Core</span>
            <span>{sysData.version}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#52b788]">PostgreSQL</span>
            <span>15.1.0</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#52b788]">System Uptime</span>
            <span>{sysData.uptime}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#52b788]">Active Region</span>
            <span>aws-us-east-1</span>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-6 rounded space-y-4 lg:col-span-2">
          <h3 className="text-xs tracking-widest text-[#74c69d] font-bold uppercase mb-4 border-b border-[#1b4332] pb-2 flex items-center gap-2">
            <Terminal size={14} /> System Operations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#1b4332] p-4 rounded bg-[#1b4332]/10 hover:bg-[#1b4332]/20 transition-colors">
              <h4 className="text-sm text-[#d8f3dc] font-bold uppercase tracking-widest mb-1">Clear Cache</h4>
              <p className="text-xs text-[#52b788] mb-4 h-8">Flushes Redis memory and forces all clients to fetch fresh configuration.</p>
              <button onClick={flushCache} className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] px-3 py-2 text-xs uppercase tracking-widest transition-colors rounded">
                Execute Flush
              </button>
            </div>

            <div className="border border-red-900/30 p-4 rounded bg-red-900/10 hover:bg-red-900/20 transition-colors">
              <h4 className="text-sm text-red-400 font-bold uppercase tracking-widest mb-1">Restart Edge Nodes</h4>
              <p className="text-xs text-red-500/70 mb-4 h-8">Force restarts all active edge functions. Causes temporary latency.</p>
              <button onClick={restartServices} className="w-full bg-red-900/40 hover:bg-red-900 text-red-300 px-3 py-2 text-xs uppercase tracking-widest transition-colors rounded">
                Execute Restart
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
