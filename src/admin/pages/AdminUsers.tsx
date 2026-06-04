import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Ban, Trash2, Eye, Key, Shield, Zap, Crown, UserPlus, Edit2, Link } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { logAdminAction } from '../lib/adminAuth';

/* 
-- CREATE OR REPLACE FUNCTION admin_change_user_plan(p_admin_id uuid, p_user_id uuid, p_plan text, p_status text)
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM admin_accounts WHERE id = p_admin_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
--   INSERT INTO user_subscriptions (user_id, plan, status, updated_at)
--   VALUES (p_user_id, p_plan, p_status, now())
--   ON CONFLICT (user_id) DO UPDATE SET plan = p_plan, status = p_status, updated_at = now();
-- END; $$;
*/


type Tab = 'ALL' | 'ACTIVE' | 'BANNED' | 'INACTIVE';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Modals
  const [banModal, setBanModal] = useState<{user: any, reason: string} | null>(null);
  const [deleteModal, setDeleteModal] = useState<{user: any, confirm: string} | null>(null);
  const [planModal, setPlanModal] = useState<{user: any, plan: string} | null>(null);
  const [addUserModal, setAddUserModal] = useState<boolean>(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', plan: 'covert' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState({ username: '', email: '' });
  const [resetLinkModal, setResetLinkModal] = useState<string | null>(null);

  useEffect(() => { 
    fetchUsers(); 
    
    // Fallback to polling every 5 seconds since Realtime is blocked by RLS for unauthenticated admin sessions
    const interval = setInterval(fetchUsers, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchUsers = async () => {
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
          plan_status: sub?.status || 'active'
        };
      });

      setUsers(merged);
    } catch (err: any) {
      console.error("Fetch users error:", err);
    }
    setLoading(false);
  };

  const getFilteredUsers = () => {
    let filtered = users;
    
    if (search) {
      filtered = filtered.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()));
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (activeTab === 'ACTIVE') {
      filtered = filtered.filter(u => !u.is_banned && new Date(u.last_seen || u.created_at) > thirtyDaysAgo);
    } else if (activeTab === 'BANNED') {
      filtered = filtered.filter(u => u.is_banned);
    } else if (activeTab === 'INACTIVE') {
      filtered = filtered.filter(u => !u.is_banned && new Date(u.last_seen || u.created_at) <= thirtyDaysAgo);
    }

    return filtered;
  };

  const handleBanUser = async () => {
    if (!banModal) return;
    try {
      const adminId = localStorage.getItem('admin_id');
      const { error } = await supabase.rpc('admin_ban_user', {
        p_admin_id: adminId,
        p_target_id: banModal.user.id,
        p_reason: banModal.reason,
        p_is_banned: true
      });
        
      if (error) {
        // Fallback if RPC doesn't exist yet
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ 
            is_banned: true, 
            ban_reason: banModal.reason,
            banned_at: new Date().toISOString()
          })
          .eq('id', banModal.user.id);
        if (fallbackError) throw fallbackError;
      }

      await logAdminAction(adminId!, 'BAN_USER', 'user', banModal.user.id, { reason: banModal.reason });
      
      toast.success('USER BANNED SUCCESSFULLY');
      setBanModal(null);
      if (selectedUser?.id === banModal.user.id) setSelectedUser({...selectedUser, is_banned: true});
      fetchUsers();
    } catch (e: any) {
      toast.error('Failed to ban user: ' + e.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    if (deleteModal.confirm !== deleteModal.user.username) {
      toast.error('Username confirmation does not match');
      return;
    }
    
    try {
      const adminId = localStorage.getItem('admin_id');
      const { error } = await supabase.rpc('admin_delete_user', { p_admin_id: adminId, p_user_id: deleteModal.user.id });
      
      if (error) {
        console.warn('RPC failed, falling back to profile delete', error);
        const { error: fallbackError } = await supabase.from('profiles').delete().eq('id', deleteModal.user.id);
        if (fallbackError) throw fallbackError;
      }

      await logAdminAction(localStorage.getItem('admin_id')!, 'DELETE_USER', 'user', deleteModal.user.id);
      
      toast.success('USER DELETED');
      setDeleteModal(null);
      setSelectedUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error('Failed to delete user: ' + e.message);
    }
  };

  const handleChangePlan = async () => {
    if (!planModal) return;
    const adminId = localStorage.getItem('admin_id');
    try {
      const oldPlan = planModal.user.plan;
      const { error } = await supabase.rpc('admin_change_user_plan', {
        p_admin_id: adminId,
        p_user_id: planModal.user.id,
        p_plan: planModal.plan,
        p_status: 'active'
      });
      
      if (error) {
        const { error: fallbackError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: planModal.user.id,
            plan: planModal.plan,
            status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (fallbackError) throw fallbackError;
      }
      
      await logAdminAction(adminId!, 'CHANGE_PLAN', 'user_subscriptions', planModal.user.id, { old_plan: oldPlan, new_plan: planModal.plan });
      toast.success(`PLAN UPDATED: ${planModal.user.username.toUpperCase()} → ${planModal.plan.toUpperCase()}`);
      
      if (selectedUser?.id === planModal.user.id) {
        setSelectedUser({ ...selectedUser, plan: planModal.plan, plan_status: 'active' });
      }
      
      // Optimistically update the main users list immediately
      setUsers(prev => prev.map(u => 
        u.id === planModal.user.id 
          ? { ...u, plan: planModal.plan, plan_status: 'active' }
          : u
      ));
      
      setPlanModal(null);
    } catch (e: any) {
      toast.error('Failed to update plan: ' + e.message);
    }
  };

  const filteredUsers = getFilteredUsers();

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adminId = localStorage.getItem('admin_id');
      
      // Auto-generate a secure temporary password if not provided
      const tempPassword = newUser.password || Math.random().toString(36).slice(-10) + 'A1!';
      
      // Generate a full 32-character MD5-style Hash (Access Key) required for login
      const md5Hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const billingEmail = import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev';
      const domain = billingEmail.includes('@') ? billingEmail.split('@')[1] : 'resend.dev';
      const fromEmail = domain === 'resend.dev' ? billingEmail : `HEXIS Admin <admin@${domain}>`;
      
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_admin_id: adminId,
        p_email: newUser.email,
        p_password: tempPassword,
        p_username: newUser.username,
        p_plan: newUser.plan,
        p_resend_key: import.meta.env.VITE_RESEND_API_KEY || '',
        p_from_email: fromEmail,
        p_md5_hash: md5Hash
      });

      if (error) throw error;
      
      toast.success('USER CREATED & SETUP EMAIL DISPATCHED VIA DATABASE');
      
      // ALWAYS show the generated credentials to the admin so they can share them manually
      // in case SMTP is not configured yet.
      setResetLinkModal(`New User Created Successfully!\n\nEmail: ${newUser.email}\nUsername: ${newUser.username}\nPassword: ${tempPassword}\nAccess Key (MD5 Hash): ${md5Hash}\n\nPlease share these credentials securely with the user.`);
      
      setAddUserModal(false);
      setNewUser({ username: '', email: '', password: '', plan: 'covert' });
      fetchUsers();
    } catch (e: any) {
      toast.error('Failed to create user: ' + e.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const adminId = localStorage.getItem('admin_id');
      const { error } = await supabase.rpc('admin_update_user', {
        p_admin_id: adminId,
        p_user_id: selectedUser.id,
        p_username: editUserData.username,
        p_email: editUserData.email
      });

      if (error) throw error;
      
      toast.success('USER UPDATED');
      setSelectedUser({ ...selectedUser, username: editUserData.username, email: editUserData.email });
      setIsEditingUser(false);
      fetchUsers();
    } catch (e: any) {
      toast.error('Failed to update user: ' + e.message);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const adminId = localStorage.getItem('admin_id');
      // Requesting an edge function or RPC to generate link, or using supabase.auth.admin if configured on backend.
      // Usually auth.admin is not available on client side unless custom RPC exists.
      const { data, error } = await supabase.rpc('admin_generate_recovery_link', {
        p_admin_id: adminId,
        p_email: selectedUser.email || (selectedUser.username + '@example.com') // fallback if email is not in profiles
      });

      if (error) {
        // Fallback: Just trigger a normal reset password email if RPC fails
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(selectedUser.email || '');
        if (resetErr) throw resetErr;
        toast.success('Recovery email sent to user');
      } else if (data) {
        setResetLinkModal(data);
      }
    } catch (e: any) {
      toast.error('Failed to reset password: ' + e.message);
    }
  };

  return (
    <div className="font-mono text-[#d8f3dc] max-w-7xl mx-auto space-y-6">
      
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
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-[#0a0a0a] border border-[#1b4332] rounded p-1">
            {(['ALL', 'ACTIVE', 'BANNED', 'INACTIVE'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1 text-xs tracking-widest uppercase rounded transition-colors ${
                  activeTab === tab ? 'bg-[#1b4332] text-[#74c69d]' : 'text-[#52b788] hover:text-[#d8f3dc]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setAddUserModal(true)}
            className="bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] px-4 py-1.5 uppercase text-xs tracking-widest flex items-center gap-2 transition-colors"
          >
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1b4332] rounded overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-[#1b4332]/20 border-b border-[#1b4332]">
            <tr>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">User</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Plan</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Created</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Last Seen</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase">Status</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] font-normal uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b4332]/50">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-[#52b788] uppercase tracking-widest">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-[#1b4332] uppercase tracking-widest">No users found</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-[#1b4332]/10 transition-colors">
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
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-4 text-[#52b788] text-xs uppercase">
                    {user.last_seen ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="p-4">
                    {user.is_banned ? (
                      <span className="px-2 py-1 bg-red-900/30 text-red-500 border border-red-900 text-[10px] tracking-widest uppercase rounded-sm">Banned</span>
                    ) : (
                      <span className="px-2 py-1 bg-[#1b4332]/50 text-[#74c69d] border border-[#1b4332] text-[10px] tracking-widest uppercase rounded-sm">Active</span>
                    )}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => setSelectedUser(user)} className="p-2 text-[#52b788] hover:bg-[#1b4332] hover:text-[#d8f3dc] rounded transition-colors" title="View">
                      <Eye size={16} />
                    </button>
                    {!user.is_banned && (
                      <button onClick={() => setBanModal({user, reason: ''})} className="p-2 text-yellow-600 hover:bg-yellow-900/20 rounded transition-colors" title="Ban">
                        <Ban size={16} />
                      </button>
                    )}
                    <button onClick={() => setDeleteModal({user, confirm: ''})} className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW USER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#1b4332] rounded w-full max-w-2xl max-h-[90vh] overflow-auto shadow-[0_0_40px_rgba(27,67,50,0.2)]">
            <div className="p-6 border-b border-[#1b4332] flex justify-between items-center">
              <h2 className="text-xl text-[#74c69d] tracking-widest uppercase font-bold">User Dossier</h2>
              <div className="flex gap-2">
                {!isEditingUser && (
                  <button onClick={() => { setIsEditingUser(true); setEditUserData({ username: selectedUser.username, email: selectedUser.email || '' }); }} className="text-[#52b788] hover:text-[#74c69d] p-1 border border-transparent hover:border-[#52b788] rounded flex items-center gap-2 text-xs uppercase tracking-widest">
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                <button onClick={() => { setSelectedUser(null); setIsEditingUser(false); }} className="text-[#52b788] hover:text-[#d8f3dc] p-1">✕</button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-6 items-center">
                <div className="w-20 h-20 rounded-full bg-[#1b4332] flex items-center justify-center text-[#74c69d] text-2xl font-bold uppercase">
                  {selectedUser.username?.substring(0, 2)}
                </div>
                {isEditingUser ? (
                  <div className="flex flex-col gap-2 flex-1">
                    <input 
                      type="text" 
                      value={editUserData.username} 
                      onChange={e => setEditUserData({...editUserData, username: e.target.value})} 
                      className="bg-[#050505] border border-[#1b4332] p-2 text-[#d8f3dc] focus:outline-none focus:border-[#74c69d]" 
                      placeholder="Username"
                    />
                    <input 
                      type="email" 
                      value={editUserData.email} 
                      onChange={e => setEditUserData({...editUserData, email: e.target.value})} 
                      className="bg-[#050505] border border-[#1b4332] p-2 text-[#d8f3dc] focus:outline-none focus:border-[#74c69d]" 
                      placeholder="Email"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleUpdateUser} className="bg-[#1b4332] text-[#74c69d] px-4 py-1 text-xs uppercase tracking-widest hover:bg-[#52b788] hover:text-black">Save</button>
                      <button onClick={() => setIsEditingUser(false)} className="border border-[#1b4332] text-[#52b788] px-4 py-1 text-xs uppercase tracking-widest hover:bg-[#1b4332]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl text-[#d8f3dc] mb-1">{selectedUser.username}</h3>
                    <div className="flex gap-3 text-xs uppercase tracking-widest text-[#52b788]">
                      <span>ID: {selectedUser.id.substring(0, 8)}</span>
                      <span>•</span>
                      <span>Created: {format(new Date(selectedUser.created_at), 'yyyy-MM-dd')}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedUser.is_banned && (
                <div className="bg-red-900/20 border border-red-900 p-4 rounded">
                  <div className="text-red-500 font-bold uppercase tracking-widest mb-1">Status: BANNED</div>
                  <div className="text-red-400 text-sm">Reason: {selectedUser.ban_reason || 'N/A'}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#1b4332] p-4 rounded bg-[#050505]">
                  <div className="text-xs text-[#52b788] uppercase tracking-widest mb-1">Total Tasks</div>
                  <div className="text-xl text-[#74c69d]">Unknown</div>
                </div>
                <div className="border border-[#1b4332] p-4 rounded bg-[#050505]">
                  <div className="text-xs text-[#52b788] uppercase tracking-widest mb-1">Total Docs</div>
                  <div className="text-xl text-[#74c69d]">Unknown</div>
                </div>
              </div>

              <div className="border border-[#1b4332] p-4 rounded bg-[#050505] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[#74c69d] tracking-widest uppercase font-bold">Subscription</h4>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-[#52b788] uppercase">Status: {selectedUser.plan_status}</span>
                    {selectedUser.plan === 'apex' ? (
                      <span className="px-2 py-1 bg-yellow-900/20 text-[#e9c46a] border border-[#e9c46a] text-[10px] tracking-widest uppercase rounded-sm">APEX</span>
                    ) : selectedUser.plan === 'phantom' ? (
                      <span className="px-2 py-1 bg-[#1b4332]/50 text-teal-400 border border-teal-600 text-[10px] tracking-widest uppercase rounded-sm">PHANTOM</span>
                    ) : (
                      <span className="px-2 py-1 bg-[#1b4332]/20 text-[#52b788] border border-[#52b788] text-[10px] tracking-widest uppercase rounded-sm">COVERT</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPlanModal({ user: selectedUser, plan: 'covert' })}
                    className={`flex-1 p-2 border transition-colors uppercase tracking-widest text-xs flex justify-center items-center gap-2 ${
                      selectedUser.plan === 'covert' ? 'bg-[#52b788]/20 border-[#52b788] text-[#52b788]' : 'border-[#1b4332] text-[#95d5b2] hover:border-[#52b788]'
                    }`}
                  >
                    <Shield size={14} /> COVERT
                  </button>
                  <button 
                    onClick={() => setPlanModal({ user: selectedUser, plan: 'phantom' })}
                    className={`flex-1 p-2 border transition-colors uppercase tracking-widest text-xs flex justify-center items-center gap-2 ${
                      selectedUser.plan === 'phantom' ? 'bg-teal-900/30 border-teal-500 text-teal-400' : 'border-[#1b4332] text-[#95d5b2] hover:border-teal-500'
                    }`}
                  >
                    <Zap size={14} /> PHANTOM
                  </button>
                  <button 
                    onClick={() => setPlanModal({ user: selectedUser, plan: 'apex' })}
                    className={`flex-1 p-2 border transition-colors uppercase tracking-widest text-xs flex justify-center items-center gap-2 ${
                      selectedUser.plan === 'apex' ? 'bg-yellow-900/20 border-[#e9c46a] text-[#e9c46a]' : 'border-[#1b4332] text-[#95d5b2] hover:border-[#e9c46a]'
                    }`}
                  >
                    <Crown size={14} /> APEX
                  </button>
                </div>
              </div>

              <div className="flex gap-3 border-t border-[#1b4332] pt-6">
                <button 
                  onClick={handleResetPassword}
                  className="flex-1 border border-[#52b788] text-[#52b788] p-3 hover:bg-[#1b4332] transition-colors uppercase tracking-widest text-sm flex justify-center items-center gap-2"
                >
                  <Key size={16} /> Reset Password
                </button>
                {!selectedUser.is_banned && (
                  <button 
                    onClick={() => { setSelectedUser(null); setBanModal({user: selectedUser, reason: ''}); }}
                    className="flex-1 border border-yellow-700 text-yellow-500 p-3 hover:bg-yellow-900/20 transition-colors uppercase tracking-widest text-sm flex justify-center items-center gap-2"
                  >
                    <Ban size={16} /> Ban User
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedUser(null); setDeleteModal({user: selectedUser, confirm: ''}); }}
                  className="flex-1 border border-red-900 text-red-500 p-3 hover:bg-red-900/20 transition-colors uppercase tracking-widest text-sm flex justify-center items-center gap-2"
                >
                  <Trash2 size={16} /> Terminate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BAN MODAL */}
      {banModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-yellow-900 rounded w-full max-w-md p-6">
            <h2 className="text-yellow-500 text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
              <Ban size={20} /> Confirm Ban
            </h2>
            <p className="text-[#d8f3dc] text-sm mb-4">You are about to ban <span className="font-bold text-yellow-500">{banModal.user.username}</span>.</p>
            <input 
              type="text" 
              placeholder="Enter ban reason..." 
              value={banModal.reason}
              onChange={e => setBanModal({...banModal, reason: e.target.value})}
              className="w-full bg-[#050505] border border-yellow-900 text-[#d8f3dc] p-3 mb-6 focus:outline-none focus:border-yellow-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 p-3 text-[#52b788] hover:bg-[#1b4332] uppercase text-sm tracking-widest">Cancel</button>
              <button onClick={handleBanUser} className="flex-1 bg-yellow-900/30 border border-yellow-900 text-yellow-500 p-3 hover:bg-yellow-900 uppercase text-sm tracking-widest">Execute Ban</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-red-900 rounded w-full max-w-md p-6">
            <h2 className="text-red-500 text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trash2 size={20} /> Terminate User
            </h2>
            <p className="text-[#d8f3dc] text-sm mb-4">
              This action is permanent and will destroy all associated data. Type <span className="font-bold text-red-500 select-all">{deleteModal.user.username}</span> to confirm.
            </p>
            <input 
              type="text" 
              placeholder="Type username..." 
              value={deleteModal.confirm}
              onChange={e => setDeleteModal({...deleteModal, confirm: e.target.value})}
              className="w-full bg-[#050505] border border-red-900 text-[#d8f3dc] p-3 mb-6 focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 p-3 text-[#52b788] hover:bg-[#1b4332] uppercase text-sm tracking-widest">Cancel</button>
              <button 
                onClick={handleDeleteUser} 
                disabled={deleteModal.confirm !== deleteModal.user.username}
                className="flex-1 bg-red-900/30 border border-red-900 text-red-500 p-3 hover:bg-red-900 uppercase text-sm tracking-widest disabled:opacity-50"
              >
                Destroy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN MODAL */}
      {planModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#52b788] rounded w-full max-w-md p-6">
            <h2 className="text-[#74c69d] text-lg uppercase tracking-widest mb-4">
              Change Subscription
            </h2>
            <p className="text-[#d8f3dc] text-sm mb-6">
              Change <span className="font-bold text-[#52b788]">{planModal.user.username}</span>'s plan to <span className="font-bold text-[#74c69d] uppercase">{planModal.plan}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPlanModal(null)} className="flex-1 p-3 border border-[#1b4332] text-[#95d5b2] hover:bg-[#1b4332] uppercase text-sm tracking-widest transition-colors">Cancel</button>
              <button onClick={handleChangePlan} className="flex-1 bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] p-3 uppercase text-sm tracking-widest transition-colors">Confirm Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {addUserModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#52b788] rounded w-full max-w-md p-6">
            <h2 className="text-[#74c69d] text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserPlus size={20} /> Add New User
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-[#52b788] text-xs uppercase tracking-widest mb-1">Username</label>
                <input 
                  type="text" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-2 focus:outline-none focus:border-[#52b788]"
                />
              </div>
              <div>
                <label className="block text-[#52b788] text-xs uppercase tracking-widest mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-2 focus:outline-none focus:border-[#52b788]"
                />
              </div>
              <div>
                <label className="block text-[#52b788] text-xs uppercase tracking-widest mb-1">Temporary Password</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-2 focus:outline-none focus:border-[#52b788]"
                />
              </div>
              <div>
                <label className="block text-[#52b788] text-xs uppercase tracking-widest mb-1">Plan</label>
                <select 
                  value={newUser.plan}
                  onChange={e => setNewUser({...newUser, plan: e.target.value})}
                  className="w-full bg-[#050505] border border-[#1b4332] text-[#d8f3dc] p-2 focus:outline-none focus:border-[#52b788]"
                >
                  <option value="covert">COVERT (Free)</option>
                  <option value="phantom">PHANTOM</option>
                  <option value="apex">APEX</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setAddUserModal(false)} className="flex-1 p-3 border border-[#1b4332] text-[#95d5b2] hover:bg-[#1b4332] uppercase text-sm tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] p-3 uppercase text-sm tracking-widest transition-colors">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET LINK MODAL */}
      {resetLinkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 font-mono">
          <div className="bg-[#0a0a0a] border border-[#52b788] rounded w-full max-w-md p-6 text-center">
            <Link className="mx-auto text-[#74c69d] mb-4" size={32} />
            <h2 className="text-[#74c69d] text-lg uppercase tracking-widest mb-2">Credentials / Link Generated</h2>
            <p className="text-[#52b788] text-xs mb-4">Share this securely with the user.</p>
            <div className="bg-[#050505] border border-[#1b4332] p-3 mb-4 break-all text-xs text-[#d8f3dc] select-all whitespace-pre-wrap text-left">
              {resetLinkModal}
            </div>
            <button onClick={() => setResetLinkModal(null)} className="w-full bg-[#1b4332]/50 border border-[#52b788] text-[#52b788] hover:bg-[#1b4332] p-3 uppercase text-sm tracking-widest transition-colors">Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
