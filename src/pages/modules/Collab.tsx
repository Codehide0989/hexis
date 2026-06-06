import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Wifi, WifiOff, Copy, LogOut, Crown, Pencil, Eye, 
  Send, Terminal, CheckCircle2, Circle, Clock, MessageSquare, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { usePlan } from '../../context/PlanContext';
import { UpgradeGate } from '../../components/ui/UpgradeGate';

export default function Collab() {
  const { user } = useAuth();
  const { canUse } = usePlan();
  
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [myRole, setMyRole] = useState('viewer');
  const [messages, setMessages] = useState<any[]>([]);
  const [sharedTasks, setSharedTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [protocol, setProtocol] = useState('');
  const [reactions, setReactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [newMessage, setNewMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reactionComment, setReactionComment] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Filters for shared tasks
  const [taskFilter, setTaskFilter] = useState('ALL');

  useEffect(() => {
    isMounted.current = true;
    const wsId = localStorage.getItem('hexis_workspace_id');
    if (wsId && user?.id) {
      loadWorkspace(wsId);
    } else {
      setLoading(false);
    }
    return () => {
      isMounted.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadWorkspace = async (wsId: string) => {
    if (!user?.id) return;
    
    try {
      // Use maybeSingle() instead of single()
      // single() throws error if 0 rows — maybeSingle() returns null
      const { data: memberData, error: memberErr } = await supabase
        .from('workspace_members')
        .select('role, collab_workspaces(*)')
        .eq('workspace_id', wsId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Only clear localStorage if we got a definitive "not a member"
      // NOT on network errors or RLS errors
      if (memberErr) {
        console.warn('[Collab] loadWorkspace error:', memberErr.message)
        // Don't clear localStorage on error — might be temporary
        // Just stop loading and show join screen
        if (isMounted.current) setLoading(false)
        return
      }

      if (!memberData || !memberData.collab_workspaces) {
        // Confirmed: user is not a member of this workspace
        localStorage.removeItem('hexis_workspace_id')
        if (isMounted.current) {
          setWorkspace(null)
          setLoading(false)
        }
        return
      }

      const ws = memberData.collab_workspaces as any

      if (isMounted.current) {
        setWorkspace(ws)
        setMyRole(memberData.role)
        setProtocol(ws.description || '')
      }

      await Promise.all([
        loadMembers(wsId),
        loadMessages(wsId),
        loadSharedTasks(wsId),
        loadActivities(wsId),
        loadReactions(wsId)
      ])

      subscribeRealtime(wsId)
    } catch (err: any) {
      console.error('[Collab] loadWorkspace exception:', err.message)
      // Network error — don't clear localStorage
      // User might be offline temporarily
      if (isMounted.current) setLoading(false)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  };

  const loadMembers = async (wsId: string) => {
    const { data } = await supabase
      .from('workspace_members')
      .select('*, profiles(username)')
      .eq('workspace_id', wsId);
    if (data) setMembers(data);
  };

  const loadMessages = async (wsId: string) => {
    const { data } = await supabase
      .from('workspace_messages')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMessages(data.reverse());
  };

  const loadSharedTasks = async (wsId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false });
    if (data) setSharedTasks(data);
  };

  const loadActivities = async (wsId: string) => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setActivities(data);
  };

  const loadReactions = async (wsId: string) => {
    const { data } = await supabase
      .from('workspace_protocol_reactions')
      .select('*')
      .eq('workspace_id', wsId);
    if (data) setReactions(data);
  };

  const subscribeRealtime = (wsId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`workspace_${wsId}_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_messages', filter: `workspace_id=eq.${wsId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${wsId}` }, () => {
        loadMembers(wsId);
        loadSharedTasks(wsId);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `workspace_id=eq.${wsId}` }, (payload) => {
        setActivities(prev => [payload.new, ...prev].slice(0, 20));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_protocol_reactions', filter: `workspace_id=eq.${wsId}` }, () => {
        loadReactions(wsId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadSharedTasks(wsId);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });
      
    channelRef.current = channel;
  };

  const logActivity = async (wsId: string, actionType: string, entity: string = '') => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || 'unknown';
    
    const { data } = await supabase.from('activity_logs').insert({
      workspace_id: wsId,
      user_id: user.id,
      username,
      action_type: actionType,
      entity
    }).select().single();

    if (data) {
      setActivities(prev => prev.some(a => a.id === data.id) ? prev : [data, ...prev].slice(0, 20));
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || !user) return;
    
    setLoading(true);
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const { data: wsData, error: wsErr } = await supabase
      .from('collab_workspaces')
      .insert({ name: workspaceName, invite_code: code, owner_id: user.id })
      .select()
      .single();
      
    if (wsErr || !wsData) {
      console.error('Create workspace error:', wsErr);
      toast.error('FAILED TO CREATE: ' + (wsErr?.message || 'Unknown error'));
      setLoading(false);
      return;
    }
    
    // Save to localStorage RIGHT AWAY before any other async ops
    localStorage.setItem('hexis_workspace_id', wsData.id);
    
    await supabase.from('workspace_members').insert({
      workspace_id: wsData.id,
      user_id: user.id,
      role: 'owner'
    });
    
    await logActivity(wsData.id, 'WORKSPACE_CREATED', wsData.name);
    
    localStorage.setItem('hexis_workspace_id', wsData.id);
    loadWorkspace(wsData.id);
  };

  const joinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim() || !user) return
    
    setLoading(true)
    
    const cleanCode = inviteCode.trim().toUpperCase()
    
    // Step 1: Find workspace by invite code
    // Use maybeSingle() — no error if not found
    const { data: wsData, error: wsErr } = await supabase
      .from('collab_workspaces')
      .select('*')
      .eq('invite_code', cleanCode)
      .eq('is_active', true)
      .maybeSingle()

    if (wsErr) {
      console.error('[Collab] join lookup error:', wsErr)
      toast.error('DATABASE ERROR: ' + wsErr.message)
      setLoading(false)
      return
    }

    if (!wsData) {
      toast.error('INVALID CODE — No workspace found with this code')
      setLoading(false)
      return
    }

    // Step 2: Check if already a member
    const { data: existing, error: existErr } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('workspace_id', wsData.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Already member — just load it
      toast.success('RECONNECTING TO WORKSPACE...')
      localStorage.setItem('hexis_workspace_id', wsData.id)
      await loadWorkspace(wsData.id)
      return
    }

    // Step 3: Join workspace
    const { error: joinErr } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: wsData.id,
        user_id: user.id,
        role: 'viewer'
      })

    if (joinErr) {
      // Handle duplicate (race condition)
      if (joinErr.code === '23505') {
        localStorage.setItem('hexis_workspace_id', wsData.id)
        await loadWorkspace(wsData.id)
        return
      }
      console.error('[Collab] join insert error:', joinErr)
      toast.error('JOIN FAILED: ' + joinErr.message)
      setLoading(false)
      return
    }

    // Step 4: Log activity and load
    await logActivity(wsData.id, 'MEMBER_JOINED', '')
    localStorage.setItem('hexis_workspace_id', wsData.id)
    toast.success('JOINED WORKSPACE: ' + wsData.name)
    await loadWorkspace(wsData.id)
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !workspace || !user) return;
    
    const msg = newMessage;
    setNewMessage('');
    
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || 'unknown';
    
    const { data } = await supabase.from('workspace_messages').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      username,
      message: msg
    }).select().single();

    if (data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    }
  };

  const advanceTaskStatus = async (task: any) => {
    if (!workspace || myRole === 'viewer') return;
    const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    
    const { data } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)
      .select('*').single();
      
    if (data) {
      setSharedTasks(prev => prev.map(t => t.id === task.id ? data : t));
      logActivity(workspace.id, 'TASK_UPDATED', `${task.title} -> ${nextStatus.toUpperCase()}`);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !workspace || !user) return;
    
    const title = newTaskTitle;
    setNewTaskTitle('');
    
    const { data } = await supabase.from('tasks').insert({
      title,
      status: 'todo',
      user_id: user.id,
      workspace_id: workspace.id
    }).select('*').single();
    
    if (data) {
      setSharedTasks(prev => [data, ...prev]);
      logActivity(workspace.id, 'TASK_ADDED', title);
    }
  };

  const saveProtocol = async () => {
    if (!workspace || myRole !== 'owner') return;
    
    const { error } = await supabase
      .from('collab_workspaces')
      .update({ description: protocol })
      .eq('id', workspace.id);
      
    if (error) {
      toast.error('Failed to save protocol');
    } else {
      toast.success('Protocol saved');
      logActivity(workspace.id, 'PROTOCOL_UPDATED', '');
    }
  };

  const addReaction = async (emoji: string) => {
    if (!workspace || !user) return;
    
    const existing = reactions.find(r => r.user_id === user.id && r.reaction === emoji);
    
    if (existing) {
      await supabase.from('workspace_protocol_reactions')
        .delete()
        .eq('id', existing.id);
    } else {
      await supabase.from('workspace_protocol_reactions')
        .upsert({
          workspace_id: workspace.id,
          user_id: user.id,
          reaction: emoji,
          comment: reactionComment
        }, { onConflict: 'workspace_id,user_id,reaction' });
        
      if (reactionComment) {
        setReactionComment('');
      }
    }
  };

  const exitWorkspace = async () => {
    if (!workspace || !user) return;
    
    if (myRole === 'owner') {
      await supabase.from('collab_workspaces').update({ is_active: false }).eq('id', workspace.id);
    } else {
      await supabase.from('workspace_members').delete().eq('workspace_id', workspace.id).eq('user_id', user.id);
    }
    
    localStorage.removeItem('hexis_workspace_id');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    setWorkspace(null);
    setMembers([]);
    setMessages([]);
    setSharedTasks([]);
    setActivities([]);
    setProtocol('');
    setReactions([]);
    setActiveTab('tasks');
    setConnected(false);
  };

  const copyInvite = () => {
    if (workspace?.invite_code) {
      navigator.clipboard.writeText(workspace.invite_code);
      toast.success('Invite code copied');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a1a0f]">
        <div className="text-[#52b788] font-mono tracking-widest animate-pulse">INITIALIZING...</div>
      </div>
    );
  }

  const getUsername = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.profiles?.username || 'unknown';
  };

  // Tasks are filtered directly in render now

  const reactionEmojis = ['👍', '✅', '🔥', '❓', '⚠️'];
  const roleColor = myRole === 'owner' ? 'text-amber-500 border-amber-500/30' : myRole === 'editor' ? 'text-[#52b788] border-[#52b788]/30' : 'text-gray-400 border-gray-400/30';
  
  return (
    <UpgradeGate feature="Collaboration" requiredPlan="phantom" enabled={canUse('collab')}>
      {!workspace ? (
        <div className="h-full flex items-center justify-center bg-[#0a1a0f] p-4">
          <div className="max-w-md w-full bg-[#0d2818] border border-[#1b4332] p-6">
            {!showCreate ? (
              <>
                <h2 className="text-[#52b788] font-mono font-bold tracking-widest mb-6 uppercase">JOIN EXISTING WORKSPACE</h2>
                <form onSubmit={joinWorkspace} className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="6-CHAR CODE"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    pattern="[A-Z0-9]{6}"
                    className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono px-4 py-3 outline-none focus:border-[#52b788] text-center tracking-[0.5em] uppercase"
                  />
                  <button type="submit" className="w-full bg-[#52b788] text-[#0a1a0f] font-mono font-bold uppercase tracking-widest px-4 py-3 hover:bg-[#74c69d] transition-colors">
                    JOIN
                  </button>
                </form>
                
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 border-t border-[#1b4332]"></div>
                  <div className="text-[#2d6a4f] font-mono text-xs">OR</div>
                  <div className="flex-1 border-t border-[#1b4332]"></div>
                </div>
                
                <button 
                  onClick={() => setShowCreate(true)}
                  className="w-full border border-[#52b788] text-[#52b788] font-mono text-sm uppercase tracking-widest px-4 py-3 hover:bg-[#52b788] hover:text-[#0a1a0f] transition-colors"
                >
                  INITIALIZE NEW WORKSPACE
                </button>
              </>
            ) : (
              <>
                <h2 className="text-[#52b788] font-mono font-bold tracking-widest mb-6 uppercase">INITIALIZE NEW WORKSPACE</h2>
                <form onSubmit={createWorkspace} className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="WORKSPACE NAME"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono px-4 py-3 outline-none focus:border-[#52b788] tracking-wider"
                  />
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 border border-[#1b4332] text-[#95d5b2] font-mono uppercase tracking-widest px-4 py-3 hover:bg-[#1b4332] transition-colors"
                    >
                      CANCEL
                    </button>
                    <button type="submit" className="flex-1 bg-[#52b788] text-[#0a1a0f] font-mono font-bold uppercase tracking-widest px-4 py-3 hover:bg-[#74c69d] transition-colors">
                      CREATE
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col bg-[#0a1a0f]">
      {/* Top header bar */}
      <div className="bg-[#0d2818] border-b border-[#1b4332] h-14 shrink-0 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {connected ? <Wifi size={16} className="text-[#52b788]" /> : <WifiOff size={16} className="text-[#e63946]" />}
          <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 border uppercase ${connected ? 'bg-[#52b788]/10 text-[#52b788] border-[#52b788]/30' : 'bg-[#e63946]/10 text-[#e63946] border-[#e63946]/30'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="font-mono font-bold text-[#d8f3dc] tracking-widest uppercase ml-2">{workspace.name}</span>
          <span className={`font-mono text-[9px] px-2 py-0.5 border uppercase tracking-widest ml-2 ${roleColor}`}>
            {myRole}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={copyInvite} className="flex items-center gap-2 text-[#95d5b2] hover:text-[#52b788] transition-colors" title="Copy Invite Code">
            <span className="font-mono text-xs tracking-widest">{workspace.invite_code}</span>
            <Copy size={14} />
          </button>
          <div className="w-px h-4 bg-[#1b4332]"></div>
          <div className="flex items-center gap-1.5 text-[#95d5b2]">
            <Users size={14} />
            <span className="font-mono text-xs">{members.length}</span>
          </div>
          <div className="w-px h-4 bg-[#1b4332]"></div>
          <button onClick={exitWorkspace} className="flex items-center gap-2 text-[#e63946] hover:text-red-400 transition-colors">
            <LogOut size={14} />
            <span className="font-mono text-xs uppercase tracking-widest hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* 3-col layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="hidden lg:flex w-[200px] bg-[#0d2818] border-r border-[#1b4332] flex-col shrink-0">
          <div className="h-10 border-b border-[#1b4332] flex items-center px-4 shrink-0">
            <span className="font-mono text-[10px] text-[#52b788] tracking-[0.2em]">TEAM ROSTER</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1b4332]">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-[#0a1a0f] border border-[#1b4332] p-2 rounded-sm">
                <div className="w-6 h-6 rounded-full bg-[#1b4332] flex items-center justify-center text-[#95d5b2] font-mono text-xs shrink-0">
                  {m.profiles?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="font-mono text-[10px] text-[#d8f3dc] truncate flex-1">{m.profiles?.username}</span>
                {m.role === 'owner' && <Crown size={12} className="text-amber-500 shrink-0" />}
                {m.role === 'editor' && <Pencil size={12} className="text-[#52b788] shrink-0" />}
                {m.role === 'viewer' && <Eye size={12} className="text-gray-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a1a0f]">
          <div className="flex border-b border-[#1b4332] overflow-x-auto [&::-webkit-scrollbar]:h-0 shrink-0">
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-3 font-mono text-xs tracking-widest whitespace-nowrap transition-colors ${activeTab === 'tasks' ? 'border-b-2 border-[#52b788] text-[#52b788] bg-[#0d2818]' : 'text-[#95d5b2] border-b-2 border-transparent hover:bg-[#0d2818]'}`}
            >
              SHARED PROTOCOLS
            </button>
            <button 
              onClick={() => setActiveTab('protocol')}
              className={`px-4 py-3 font-mono text-xs tracking-widest whitespace-nowrap transition-colors ${activeTab === 'protocol' ? 'border-b-2 border-[#52b788] text-[#52b788] bg-[#0d2818]' : 'text-[#95d5b2] border-b-2 border-transparent hover:bg-[#0d2818]'}`}
            >
              WORKSPACE PROTOCOL
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-3 font-mono text-xs tracking-widest whitespace-nowrap transition-colors ${activeTab === 'activity' ? 'border-b-2 border-[#52b788] text-[#52b788] bg-[#0d2818]' : 'text-[#95d5b2] border-b-2 border-transparent hover:bg-[#0d2818]'}`}
            >
              SYSTEM LOG
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`xl:hidden px-4 py-3 font-mono text-xs tracking-widest whitespace-nowrap transition-colors ${activeTab === 'chat' ? 'border-b-2 border-[#52b788] text-[#52b788] bg-[#0d2818]' : 'text-[#95d5b2] border-b-2 border-transparent hover:bg-[#0d2818]'}`}
            >
              WORKSPACE CHAT
            </button>
            <button 
              onClick={() => setActiveTab('roster')}
              className={`lg:hidden px-4 py-3 font-mono text-xs tracking-widest whitespace-nowrap transition-colors ${activeTab === 'roster' ? 'border-b-2 border-[#52b788] text-[#52b788] bg-[#0d2818]' : 'text-[#95d5b2] border-b-2 border-transparent hover:bg-[#0d2818]'}`}
            >
              TEAM ROSTER
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1b4332]">
            
            {activeTab === 'tasks' && (
              <div className="flex flex-col h-full min-h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
                  {['TODO', 'IN_PROGRESS', 'DONE'].map(status => (
                    <div key={status} className="flex flex-col bg-[#0d2818] border border-[#1b4332] rounded-sm overflow-hidden h-full">
                      <div className="bg-[#1b4332] p-2 flex justify-between items-center shrink-0">
                        <span className="font-mono text-[10px] text-[#52b788] tracking-widest">{status.replace('_', ' ')}</span>
                        <span className="font-mono text-[9px] text-[#d8f3dc] bg-[#0a1a0f] px-2 py-0.5 rounded-sm">
                          {sharedTasks.filter(t => t.status === status.toLowerCase()).length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1b4332]">
                        {sharedTasks.filter(t => t.status === status.toLowerCase()).map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => advanceTaskStatus(t)}
                            className={`bg-[#0a1a0f] border border-[#1b4332] p-3 flex flex-col gap-2 transition-colors ${myRole !== 'viewer' ? 'cursor-pointer hover:border-[#52b788]' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              {t.status === 'done' ? <CheckCircle2 size={14} className="text-[#52b788] shrink-0 mt-0.5" /> :
                               t.status === 'in_progress' ? <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" /> :
                               <Circle size={14} className="text-gray-500 shrink-0 mt-0.5" />}
                              <span className="font-mono text-[11px] text-[#d8f3dc] leading-relaxed break-words">{t.title}</span>
                            </div>
                            <div className="flex justify-end mt-1">
                              <span className="font-mono text-[9px] text-[#52b788] bg-[#0d2818] px-1.5 py-0.5 border border-[#1b4332]">
                                @{getUsername(t.user_id)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {status === 'TODO' && myRole !== 'viewer' && (
                          <form onSubmit={handleAddTask} className="mt-2 shrink-0">
                            <input
                              type="text"
                              value={newTaskTitle}
                              onChange={e => setNewTaskTitle(e.target.value)}
                              placeholder="+ ADD PROTOCOL"
                              className="w-full bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc] font-mono text-[10px] px-3 py-2 outline-none focus:border-[#52b788] tracking-widest placeholder:text-[#2d6a4f]"
                            />
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'protocol' && (
              <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto w-full">
                {myRole === 'owner' ? (
                  <div className="flex flex-col gap-2 flex-1 min-h-[300px]">
                    <textarea 
                      value={protocol}
                      onChange={e => setProtocol(e.target.value)}
                      placeholder="ENTER WORKSPACE PROTOCOL / MANIFESTO..."
                      className="flex-1 bg-[#0d2818] border border-[#1b4332] p-4 text-[#d8f3dc] font-sans text-sm outline-none focus:border-[#52b788] resize-none"
                    />
                    <button 
                      onClick={saveProtocol}
                      className="self-end bg-[#52b788] text-[#0a1a0f] font-mono font-bold tracking-widest px-6 py-2 uppercase text-xs hover:bg-[#74c69d]"
                    >
                      SAVE PROTOCOL
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#0d2818] border border-[#1b4332] p-6 text-[#d8f3dc] font-sans text-sm flex-1 min-h-[300px] whitespace-pre-wrap">
                    {protocol || <span className="text-[#2d6a4f] font-mono text-xs tracking-widest uppercase">NO PROTOCOL ESTABLISHED</span>}
                  </div>
                )}
                
                {/* Reactions bar */}
                <div className="bg-[#0d2818] border border-[#1b4332] p-3 flex gap-2 flex-wrap items-center">
                  {reactionEmojis.map(emoji => {
                    const count = reactions.filter(r => r.reaction === emoji).length;
                    const myReaction = reactions.find(r => r.reaction === emoji && r.user_id === user?.id);
                    return (
                      <button 
                        key={emoji}
                        onClick={() => addReaction(emoji)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-sm font-mono text-xs transition-colors
                          ${myReaction ? 'bg-[#1b4332] border-[#52b788] text-[#d8f3dc]' : 'bg-[#0a1a0f] border-[#1b4332] text-[#95d5b2] hover:border-[#52b788]'}`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Comments Section */}
                <div className="bg-[#0d2818] border border-[#1b4332] p-4 flex flex-col gap-4 mt-2">
                  <h3 className="font-mono text-[10px] text-[#52b788] tracking-[0.2em] border-b border-[#1b4332] pb-2">REACTION COMMENTS</h3>
                  
                  {myRole !== 'owner' && (
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={reactionComment}
                        onChange={(e) => setReactionComment(e.target.value)}
                        placeholder="ADD A COMMENT..."
                        className="flex-1 bg-[#0a1a0f] border border-[#1b4332] px-3 py-2 text-xs font-sans text-[#d8f3dc] outline-none focus:border-[#52b788]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {reactions.filter(r => r.comment).length === 0 ? (
                      <div className="text-[#2d6a4f] font-mono text-xs tracking-widest">NO COMMENTS</div>
                    ) : (
                      reactions.filter(r => r.comment).map(r => {
                        const commenter = members.find(m => m.user_id === r.user_id)?.profiles?.username || 'unknown';
                        return (
                          <div key={r.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#52b788]">@{commenter}</span>
                              <span className="text-sm">{r.reaction}</span>
                            </div>
                            <div className="text-xs text-[#d8f3dc] font-sans pl-2 border-l border-[#1b4332] ml-1">
                              {r.comment}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="flex flex-col gap-1 font-mono text-xs p-2">
                {activities.length === 0 ? (
                  <div className="text-[#2d6a4f] tracking-widest">AWAITING ACTIVITY...</div>
                ) : (
                  activities.map(act => (
                    <div key={act.id} className="text-[#52b788] break-all leading-relaxed">
                      <span className="text-[#2d6a4f]">&gt;</span> [{format(new Date(act.created_at), 'HH:mm')}] <span className="text-[#d8f3dc]">{act.username}</span>: {act.action_type} {act.entity && <span className="text-[#95d5b2]">{act.entity}</span>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-[calc(100vh-180px)] xl:hidden">
                <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 pr-2">
                  {messages.length === 0 ? (
                    <div className="text-[#2d6a4f] font-mono text-xs tracking-widest uppercase text-center mt-4">NO MESSAGES YET</div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.user_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end pl-8' : 'items-start pr-8'}`}>
                          <span className="font-mono text-[10px] text-[#52b788] mb-0.5">@{msg.username}</span>
                          <div className={`px-3 py-2 text-xs font-sans rounded-sm ${isMe ? 'bg-[#0a1a0f] border border-[#1b4332] text-[#d8f3dc]' : 'text-[#95d5b2]'}`}>
                            {msg.message}
                          </div>
                          <span className="font-mono text-[9px] text-[#1b4332] mt-1">{format(new Date(msg.created_at), 'HH:mm')}</span>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendMessage} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="TRANSMIT MESSAGE..."
                    className="flex-1 bg-[#0d2818] border border-[#1b4332] text-[#d8f3dc] font-sans text-xs px-3 py-2 outline-none focus:border-[#52b788]"
                  />
                  <button type="submit" className="bg-[#1b4332] text-[#52b788] px-3 py-2 hover:bg-[#52b788] hover:text-[#0a1a0f] transition-colors border border-[#1b4332]">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'roster' && (
              <div className="lg:hidden flex flex-col gap-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-[#0d2818] border border-[#1b4332] p-3 rounded-sm">
                    <div className="w-8 h-8 rounded-full bg-[#1b4332] flex items-center justify-center text-[#95d5b2] font-mono text-sm shrink-0">
                      {m.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="font-mono text-xs text-[#d8f3dc] truncate flex-1">{m.profiles?.username}</span>
                    <span className={`font-mono text-[9px] px-2 py-0.5 border uppercase tracking-widest ${m.role === 'owner' ? 'text-amber-500 border-amber-500/30' : m.role === 'editor' ? 'text-[#52b788] border-[#52b788]/30' : 'text-gray-400 border-gray-400/30'}`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* RIGHT PANEL - CHAT (Desktop only) */}
        <div className="hidden xl:flex w-[280px] bg-[#0d2818] border-l border-[#1b4332] flex-col shrink-0">
          <div className="h-10 border-b border-[#1b4332] flex items-center justify-between px-4 shrink-0">
            <span className="font-mono text-[10px] text-[#52b788] tracking-[0.2em] flex items-center gap-2">
              <MessageSquare size={12} />
              WORKSPACE_CHAT
            </span>
            <span className="font-mono text-[9px] text-[#2d6a4f]">{messages.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#1b4332]">
            {messages.length === 0 ? (
              <div className="text-[#2d6a4f] font-mono text-xs tracking-widest uppercase text-center mt-4">NO MESSAGES YET</div>
            ) : (
              messages.map(msg => {
                const isMe = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end pl-6' : 'items-start pr-6'}`}>
                    <span className="font-mono text-[10px] text-[#52b788] mb-0.5">@{msg.username}</span>
                    <div className={`px-2 py-1.5 text-xs font-sans rounded-sm w-full ${isMe ? 'bg-[#0a1a0f] text-[#d8f3dc] border-l border-[#1b4332] ml-auto text-right' : 'text-[#95d5b2]'}`}>
                      {msg.message}
                    </div>
                    <span className="font-mono text-[9px] text-[#1b4332] mt-0.5 self-end">{format(new Date(msg.created_at), 'HH:mm')}</span>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-[#1b4332] p-3 flex gap-2 shrink-0 bg-[#0a1a0f]">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="TRANSMIT..."
              className="flex-1 bg-transparent border-b border-[#1b4332] text-[#d8f3dc] font-sans text-xs px-2 py-1.5 outline-none focus:border-[#52b788]"
            />
            <button type="submit" className="text-[#52b788] hover:text-[#d8f3dc] transition-colors p-1.5">
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>
    </div>
    )}
    </UpgradeGate>
  );
}
