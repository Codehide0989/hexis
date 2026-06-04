import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Download, CreditCard, Users, Zap, Crown, Shield, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { logAdminAction } from '../lib/adminAuth';

type PlanFilter = 'ALL' | 'COVERT' | 'PHANTOM' | 'APEX';

export default function AdminPlans() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Bulk Action Modal
  const [bulkPlanModal, setBulkPlanModal] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const adminId = localStorage.getItem('admin_id');
      if (!adminId) return;

      const { data: profilesData, error: profilesError } = await supabase.rpc('admin_get_profiles', { p_admin_id: adminId });
      if (profilesError) throw profilesError;
      
      const { data: subsData, error: subsError } = await supabase.rpc('admin_get_subscriptions', { p_admin_id: adminId });
      
      if (subsError) {
        console.warn("Failed to fetch subscriptions via RPC, plans will default to COVERT. Ensure admin_get_subscriptions is deployed.");
      }

      const merged = (profilesData || []).map((p: any) => {
        const sub = (subsData || []).find((s: any) => s.user_id === p.id);
        return {
          ...p,
          plan: sub?.plan || 'covert',
          plan_status: sub?.status || 'active',
          plan_updated_at: sub?.updated_at || p.created_at
        };
      });

      setUsers(merged);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u => {
    if (search && !u.username?.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== 'ALL' && u.plan.toUpperCase() !== planFilter) return false;
    return true;
  });

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleBulkChangePlan = async () => {
    if (!bulkPlanModal || selectedUsers.length === 0) return;
    try {
      const adminId = localStorage.getItem('admin_id');
      const newPlan = bulkPlanModal;
      
      for (const userId of selectedUsers) {
        const oldPlan = users.find(u => u.id === userId)?.plan;
        const { error } = await supabase.rpc('admin_change_user_plan', {
          p_admin_id: adminId,
          p_user_id: userId,
          p_plan: newPlan,
          p_status: 'active'
        });
        
        if (error) {
          await supabase.from('user_subscriptions').upsert({
            user_id: userId,
            plan: newPlan,
            status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }
        await logAdminAction(adminId!, 'CHANGE_PLAN_BULK', 'user_subscriptions', userId, { old_plan: oldPlan, new_plan: newPlan });
      }
      
      toast.success(`Updated ${selectedUsers.length} users to ${newPlan.toUpperCase()}`);
      
      // Optimistically update the UI instantly
      setUsers(prev => prev.map(u => 
        selectedUsers.includes(u.id)
          ? { ...u, plan: newPlan, plan_status: 'active' }
          : u
      ));
      
      setBulkPlanModal(null);
      setSelectedUsers([]);
    } catch (err: any) {
      toast.error('Bulk update failed: ' + err.message);
    }
  };

  const exportCSV = () => {
    const headers = ['User ID', 'Username', 'Email', 'Plan', 'Status', 'Updated At'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => 
        `"${u.id}","${u.username}","${u.email || ''}","${u.plan.toUpperCase()}","${u.plan_status}","${new Date(u.plan_updated_at).toISOString()}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hexis_plans_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const planCounts = {
    covert: users.filter(u => u.plan === 'covert').length,
    phantom: users.filter(u => u.plan === 'phantom').length,
    apex: users.filter(u => u.plan === 'apex').length,
  };
  
  const mrr = (planCounts.phantom * 5) + (planCounts.apex * 15);

  return (
    <div className="font-mono text-[#d8f3dc] max-w-7xl mx-auto space-y-6">
      
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#52b788] tracking-widest uppercase mb-1">Total MRR</div>
            <div className="text-2xl font-bold text-[#74c69d]">${mrr}/mo</div>
          </div>
          <CreditCard size={24} className="text-[#1b4332]" />
        </div>
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#52b788] tracking-widest uppercase mb-1">Covert Users</div>
            <div className="text-2xl font-bold text-[#74c69d]">{planCounts.covert}</div>
          </div>
          <Shield size={24} className="text-[#1b4332]" />
        </div>
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#52b788] tracking-widest uppercase mb-1">Phantom Users</div>
            <div className="text-2xl font-bold text-teal-400">{planCounts.phantom}</div>
          </div>
          <Zap size={24} className="text-teal-900" />
        </div>
        <div className="bg-[#0a0a0a] border border-[#1b4332] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#52b788] tracking-widest uppercase mb-1">Apex Users</div>
            <div className="text-2xl font-bold text-[#e9c46a]">{planCounts.apex}</div>
          </div>
          <Crown size={24} className="text-yellow-900" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1b4332]" size={18} />
          <input 
            type="text" 
            placeholder="Search username..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#1b4332] pl-10 pr-4 py-2 focus:outline-none focus:border-[#74c69d] text-sm text-[#d8f3dc] uppercase tracking-widest placeholder:text-[#1b4332]"
          />
        </div>
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex bg-[#0a0a0a] border border-[#1b4332] rounded p-1">
            {(['ALL', 'COVERT', 'PHANTOM', 'APEX'] as PlanFilter[]).map(tab => (
              <button
                key={tab}
                onClick={() => setPlanFilter(tab)}
                className={`px-4 py-1 text-xs tracking-widest uppercase rounded transition-colors ${
                  planFilter === tab ? 'bg-[#1b4332] text-[#74c69d]' : 'text-[#52b788] hover:text-[#d8f3dc]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={exportCSV}
            className="bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] px-4 py-1.5 uppercase text-xs tracking-widest flex items-center gap-2 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {selectedUsers.length > 0 && (
        <div className="bg-[#1b4332]/30 border border-[#52b788] p-3 flex justify-between items-center">
          <span className="text-sm text-[#74c69d] font-bold uppercase tracking-widest">{selectedUsers.length} Users Selected</span>
          <div className="flex gap-2">
            <button onClick={() => setBulkPlanModal('covert')} className="bg-[#050505] border border-[#52b788] text-[#52b788] px-3 py-1 text-xs uppercase tracking-widest hover:bg-[#52b788] hover:text-black transition-colors">SET COVERT</button>
            <button onClick={() => setBulkPlanModal('phantom')} className="bg-[#050505] border border-teal-500 text-teal-500 px-3 py-1 text-xs uppercase tracking-widest hover:bg-teal-500 hover:text-black transition-colors">SET PHANTOM</button>
            <button onClick={() => setBulkPlanModal('apex')} className="bg-[#050505] border border-[#e9c46a] text-[#e9c46a] px-3 py-1 text-xs uppercase tracking-widest hover:bg-[#e9c46a] hover:text-black transition-colors">SET APEX</button>
          </div>
        </div>
      )}

      <div className="bg-[#0a0a0a] border border-[#1b4332] rounded overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-[#1b4332]/20 border-b border-[#1b4332]">
            <tr>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase w-12">
                <input 
                  type="checkbox" 
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                  onChange={toggleSelectAll}
                  className="accent-[#52b788]"
                />
              </th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">User</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Plan</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Status</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b4332]/50">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-[#52b788] uppercase tracking-widest">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-[#1b4332] uppercase tracking-widest">No users found</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-[#1b4332]/10 transition-colors ${selectedUsers.includes(user.id) ? 'bg-[#1b4332]/20' : ''}`}>
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="accent-[#52b788]"
                    />
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1b4332] flex items-center justify-center text-[#74c69d] font-bold text-xs uppercase">
                      {user.username?.substring(0, 2)}
                    </div>
                    <span className="text-[#d8f3dc]">{user.username}</span>
                  </td>
                  <td className="p-4">
                    {user.plan === 'apex' ? (
                      <span className="px-2 py-1 bg-yellow-900/20 text-[#e9c46a] border border-[#e9c46a] text-[10px] tracking-widest uppercase rounded-sm">APEX</span>
                    ) : user.plan === 'phantom' ? (
                      <span className="px-2 py-1 bg-[#1b4332]/50 text-teal-400 border border-teal-600 text-[10px] tracking-widest uppercase rounded-sm">PHANTOM</span>
                    ) : (
                      <span className="px-2 py-1 bg-[#1b4332]/20 text-[#52b788] border border-[#52b788] text-[10px] tracking-widest uppercase rounded-sm">COVERT</span>
                    )}
                  </td>
                  <td className="p-4 text-[#52b788] text-xs uppercase">
                    {user.plan_status}
                  </td>
                  <td className="p-4 text-[#52b788] text-xs uppercase">
                    {format(new Date(user.plan_updated_at), 'MMM dd, yyyy HH:mm')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {bulkPlanModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#52b788] rounded w-full max-w-md p-6">
            <h2 className="text-[#74c69d] text-lg uppercase tracking-widest mb-4">
              Bulk Update Plans
            </h2>
            <p className="text-[#d8f3dc] text-sm mb-6">
              Change plan for <span className="font-bold text-[#52b788]">{selectedUsers.length} users</span> to <span className="font-bold text-[#74c69d] uppercase">{bulkPlanModal}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setBulkPlanModal(null)} className="flex-1 p-3 border border-[#1b4332] text-[#95d5b2] hover:bg-[#1b4332] uppercase text-sm tracking-widest transition-colors">Cancel</button>
              <button onClick={handleBulkChangePlan} className="flex-1 bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] p-3 uppercase text-sm tracking-widest transition-colors">Confirm Bulk Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
