import { useState, useEffect } from 'react';
import { Activity, Plus, ArrowRight, Loader2, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ActivityLog {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    totalKanbanCards: 0,
    pendingKanbanCards: 0
  });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Tasks Stats
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      
      // Fetch Kanban Stats
      const { data: kanbanData, error: kanbanError } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('user_id', user.id);

      if (!tasksError && tasksData) {
        setStats(s => ({ 
          ...s, 
          totalTasks: tasksData.length,
          pendingTasks: tasksData.filter(t => t.status !== 'done').length
        }));
      }

      if (!kanbanError && kanbanData) {
        setStats(s => ({
          ...s,
          totalKanbanCards: kanbanData.length,
          pendingKanbanCards: kanbanData.filter(t => t.status !== 'DONE').length
        }));
      }

      // Build Activity Log
      const allActivities: ActivityLog[] = [];
      if (tasksData) {
        tasksData.forEach(t => allActivities.push({
          id: `t-${t.id}`, type: 'TASK', title: t.title, created_at: t.created_at
        }));
      }
      if (kanbanData) {
        kanbanData.forEach(k => allActivities.push({
          id: `k-${k.id}`, type: 'KANBAN_CARD', title: k.title, created_at: k.created_at
        }));
      }

      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivities(allActivities.slice(0, 10)); // Top 10 recent activities

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: "TOTAL TASKS", value: stats.totalTasks, trend: "ALL" },
          { title: "PENDING TASKS", value: stats.pendingTasks, trend: "TODO" },
          { title: "KANBAN CARDS", value: stats.totalKanbanCards, trend: "ALL" },
          { title: "ACTIVE CARDS", value: stats.pendingKanbanCards, trend: "IN_PROG" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#0d2818] p-5 border border-[#1b4332] relative overflow-hidden group min-h-[100px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#1b4332] opacity-20 -rotate-45 transform translate-x-8 -translate-y-8 group-hover:bg-[#52b788] transition-colors"></div>
            <div className="font-mono text-[10px] text-[#52b788] tracking-widest mb-2 uppercase flex justify-between relative z-10">
              {stat.title}
              <span className="text-[#95d5b2]">{stat.trend}</span>
            </div>
            <div className="font-mono text-3xl text-[#d8f3dc] font-bold relative z-10 flex items-center h-9">
              {loading ? (
                <div className="animate-pulse bg-[#0d2818] h-8 w-16 border border-[#1b4332]" />
              ) : (
                stat.value.toString()
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0d2818] p-6 border border-[#1b4332] min-h-[300px]">
          <div className="border-b border-[#1b4332] pb-4 mb-4 font-mono text-sm tracking-widest text-[#52b788] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} /> RECENT_ACTIVITY
            </div>
            {loading && <Loader2 size={14} className="animate-spin text-[#2d6a4f]" />}
          </div>
          <div className="space-y-4">
            {!loading && activities.length === 0 ? (
              <div className="text-center py-12">
                <Terminal size={32} className="text-[#1b4332] mx-auto mb-3" />
                <p className="font-mono text-xs text-[#1b4332]">
                  NO ACTIVITY RECORDED
                </p>
              </div>
            ) : (
              activities.map((log) => (
                <div key={log.id} className="font-mono text-xs text-[#95d5b2] flex items-center gap-3">
                  <span className="text-[#2d6a4f] w-12 shrink-0">{formatDate(log.created_at)}</span> 
                  <span className="text-[#52b788]">&gt;</span> 
                  <span className="truncate">NEW [{log.type}] ADDED: {log.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-[#0d2818] p-6 border border-[#1b4332] flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 text-[#0a1a0f]">
            <Activity size={120} strokeWidth={1} />
          </div>
          <div className="border-b border-[#1b4332] pb-4 mb-4 font-mono text-sm tracking-widest text-[#52b788] flex items-center gap-2 relative z-10">
            <Plus size={16} /> QUICK_ACTIONS
          </div>
          <div className="space-y-3 flex-1 flex flex-col justify-center relative z-10">
             <button onClick={() => navigate('/dashboard/invoices')} className="w-full text-left px-4 min-h-[48px] bg-[#0a1a0f] border border-[#1b4332] hover:border-[#52b788] hover:text-[#52b788] text-[#d8f3dc] font-mono text-xs uppercase flex justify-between items-center transition-colors">
               <span>CREATE INVOICE</span>
               <ArrowRight size={14} className="text-[#2d6a4f]" />
             </button>
             <button onClick={() => navigate('/dashboard/tasks')} className="w-full text-left px-4 min-h-[48px] bg-[#0a1a0f] border border-[#1b4332] hover:border-[#52b788] hover:text-[#52b788] text-[#d8f3dc] font-mono text-xs uppercase flex justify-between items-center transition-colors">
               <span>ADD TASK</span>
               <ArrowRight size={14} className="text-[#2d6a4f]" />
             </button>
             <button onClick={() => navigate('/dashboard/kanban')} className="w-full text-left px-4 min-h-[48px] bg-[#0a1a0f] border border-[#1b4332] hover:border-[#52b788] hover:text-[#52b788] text-[#d8f3dc] font-mono text-xs uppercase flex justify-between items-center transition-colors">
               <span>PROJECT BOARD</span>
               <ArrowRight size={14} className="text-[#2d6a4f]" />
             </button>
             <button onClick={() => navigate('/dashboard/calendar')} className="w-full text-left px-4 min-h-[48px] bg-[#0a1a0f] border border-[#1b4332] hover:border-[#52b788] hover:text-[#52b788] text-[#d8f3dc] font-mono text-xs uppercase flex justify-between items-center transition-colors">
               <span>NEW EVENT</span>
               <ArrowRight size={14} className="text-[#2d6a4f]" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
