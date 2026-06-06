import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Lock, Activity, Bell, Database, Info, Eye, EyeOff, Save, Download, Trash2, DollarSign, AlertTriangle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { getDiscordOAuthUrl, unlinkDiscord } from '../../lib/discord';
import { generateDiscordLinkCode } from '../../lib/discordSync';

export default function Settings() {
  const { user } = useAuth();
  const [username, setUsername] = useState('OPERATOR_01');
  const [isSaving, setIsSaving] = useState(false);
  const [md5Key, setMd5Key] = useState('NO_KEY_FOUND');
  const [showKey, setShowKey] = useState(false);
  const [currency, setCurrency] = useState(localStorage.getItem('hexis_currency') || 'INR');
  
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordAvatar, setDiscordAvatar] = useState<string | null>(null);
  const [discordLinkedAt, setDiscordLinkedAt] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { stats } = useRealtimeData();
  const [memberSince, setMemberSince] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      )
    } catch {
      return false
    }
  });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, md5_hash')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        // Only update state if still mounted
        if (!isMounted.current) return;
        
        setUsername(data?.username || user.email?.split('@')[0] || '');
        if (isMounted.current) {
          setMd5Key(data?.md5_hash || '');
        }

        // Load account stats
        if (isMounted.current) {
          setMemberSince(
            new Date(user.created_at || Date.now())
              .toLocaleDateString('en-IN', {
                day: '2-digit', month: 'long', year: 'numeric'
              })
          );
        }
      } catch (err) {
        if (!isMounted.current) return;
        console.error('Profile load error:', err);
      }
    };
    
    const loadDiscord = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('discord_id, discord_username, discord_avatar, discord_linked_at')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (data && isMounted.current) {
          setDiscordId(data.discord_id || null);
          setDiscordUsername(data.discord_username || null);
          setDiscordAvatar(data.discord_avatar || null);
          setDiscordLinkedAt(data.discord_linked_at || null);
        }
      } catch (err) {
        console.error('Discord load error:', err);
      }
    };

    loadProfile();
    loadDiscord();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!user?.id || !username.trim()) return;
    if (isMounted.current) setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('PROFILE UPDATED');
      if (isMounted.current) setUsername(username.trim());
    } catch (err: any) {
      toast.error('UPDATE FAILED: ' + err.message);
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const startDiscordLink = async () => {
    const code = await generateDiscordLinkCode();
    if (code) setLinkCode(code);
    else toast.error('Failed to generate link code');
  };

  const handleUnlink = async () => {
    if (!user?.id) return;
    if (confirm('Are you sure you want to unlink your Discord account?')) {
      const ok = await unlinkDiscord(user.id);
      if (ok) {
        toast.success('DISCORD ACCOUNT UNLINKED');
        setDiscordId(null);
        setDiscordUsername(null);
        setDiscordAvatar(null);
        setDiscordLinkedAt(null);
      } else {
        toast.error('UNLINK FAILED');
      }
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) return;
    if (newPassword.length < 8) {
      toast.error('PASSWORD TOO SHORT (min 8 chars)');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success('PASSWORD UPDATED');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('FAILED: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const requestNotifications = async () => {
    if (notificationsEnabled) return;
    try {
      if (
        typeof window === 'undefined' || 
        !('Notification' in window)
      ) {
        toast.error('NOTIFICATIONS NOT SUPPORTED');
        return;
      }
      const permission = await Notification.requestPermission();
      if (isMounted.current) {
        const granted = permission === 'granted';
        setNotificationsEnabled(granted);
        toast.success(
          granted 
            ? 'NOTIFICATIONS ENABLED' 
            : 'PERMISSION DENIED'
        );
      }
    } catch (err: any) {
      if (isMounted.current) {
        toast.error('NOTIFICATION ERROR');
      }
    }
  };

  const exportData = async () => {
    if (!user?.id) return;
    try {
      toast.loading('PREPARING EXPORT...');
      
      const [tasksRes, todosRes, invoicesRes, 
             txRes, remindersRes, docsRes] = 
        await Promise.allSettled([
          supabase.from('tasks').select('*').eq('user_id', user.id),
          supabase.from('todos').select('*').eq('user_id', user.id),
          supabase.from('invoices').select('*').eq('user_id', user.id),
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('reminders').select('*').eq('user_id', user.id),
          supabase.from('docs').select('*').eq('user_id', user.id),
        ]);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data : [],
        todos: todosRes.status === 'fulfilled' ? todosRes.value.data : [],
        invoices: invoicesRes.status === 'fulfilled' ? invoicesRes.value.data : [],
        transactions: txRes.status === 'fulfilled' ? txRes.value.data : [],
        reminders: remindersRes.status === 'fulfilled' ? remindersRes.value.data : [],
        docs: docsRes.status === 'fulfilled' ? docsRes.value.data : [],
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hexis_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('EXPORT COMPLETE');
    } catch (err: any) {
      toast.dismiss();
      toast.error('EXPORT FAILED: ' + err.message);
    }
  };

  const deleteData = () => {
    if (confirm('CRITICAL WARNING: This will purge all local data. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!user) {
    return (
      <div className="p-8 bg-[var(--color-bg)] min-h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[var(--color-surface)] border border-[var(--color-border)]"/>
          <div className="h-48 bg-[var(--color-surface)] border border-[var(--color-border)]"/>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-3 md:p-6 font-mono text-[var(--color-text)] min-h-full space-y-4 md:space-y-8">
        
        <div className="border-b border-[var(--color-border)] pb-4 mb-6">
          <h1 className="text-lg md:text-2xl font-bold tracking-widest uppercase">SYSTEM_SETTINGS</h1>
        </div>

        <div className="grid gap-4 md:gap-6 md:p-0">
          
          {/* Profile */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase"><User className="w-5 h-5" /> Profile_Configuration</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-1">OPERATOR_ALIAS</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => {
                      if (isMounted.current) setUsername(e.target.value)
                    }}
                    className="flex-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button onClick={handleSaveProfile} disabled={isSaving} className="px-3 md:px-4 py-2 border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] transition-colors flex items-center gap-2 text-[var(--color-primary)] text-xs md:text-sm shrink-0 whitespace-nowrap">
                    <Save className="w-4 h-4" />
                    {isSaving ? 'SYNCING...' : 'APPLY'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Discord Integration */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Discord_Integration
            </h2>
            <div className="max-w-md">
              {discordId ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[var(--color-bg)] border border-[var(--color-border)]">
                  {discordAvatar ? (
                    <img src={discordAvatar} alt="avatar" className="w-12 h-12 rounded-full border border-[var(--color-primary)]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1b4332] border border-[var(--color-primary)] flex items-center justify-center font-bold text-sm text-[var(--color-primary)]">
                      {discordUsername?.slice(0, 2).toUpperCase() || 'D'}
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-bold text-sm text-[var(--color-primary)]">@{discordUsername} <span className="text-[#52b788] ml-2">LINKED ✓</span></p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">LINKED_ON: {discordLinkedAt ? new Date(discordLinkedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <button onClick={handleUnlink} className="px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] transition-colors text-xs font-bold uppercase tracking-wider shrink-0">
                    UNLINK
                  </button>
                </div>
              ) : linkCode ? (
                <div className="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
                  <p className="text-xs text-[var(--color-text)] uppercase font-bold mb-2">RUN THIS COMMAND IN THE HEXIS DISCORD</p>
                  <code className="text-sm md:text-lg text-[var(--color-primary)] bg-[#050505] p-2 md:p-3 block mb-3 md:mb-4 border border-[var(--color-border)] break-all">/link {linkCode}</code>
                  <p className="text-[10px] text-[var(--color-muted)]">Code expires in 10 minutes. It syncs your plan with Discord roles.</p>
                </div>
              ) : (
                <div className="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-text)] uppercase font-bold">LINK YOUR DISCORD ACCOUNT</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">Receive alerts and synced plan status in your server</p>
                  </div>
                  <button onClick={startDiscordLink} className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white transition-colors text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    LINK DISCORD
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Security */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase"><Shield className="w-5 h-5" /> Security_Keys</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-1">MD5_ACCESS_TOKEN</label>
                <div className="flex items-center justify-between w-full bg-[var(--color-bg)] border border-[var(--color-border)] px-2 md:px-3 py-2 overflow-hidden">
                  <span className="tracking-widest font-bold text-[var(--color-text)] overflow-hidden text-ellipsis text-xs md:text-sm max-w-[85%]">
                    {showKey ? md5Key : '••••••••••••••••••••••••••••••••'}
                  </span>
                  <button onClick={() => {
                    if (isMounted.current) setShowKey(!showKey)
                  }} className="p-1 text-[var(--color-text)] hover:text-[var(--color-muted)] transition-colors">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Password Change */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase">
              <Lock className="w-5 h-5" /> Change_Password
            </h2>
            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-1">
                  NEW_PASSWORD
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-1">
                  CONFIRM_PASSWORD
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={!newPassword || newPassword !== confirmPassword}
                className="px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> UPDATE_PASSWORD
              </button>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-[var(--color-danger)] font-mono">
                  PASSWORDS DO NOT MATCH
                </p>
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase"><Bell className="w-5 h-5" /> System_Alerts</h2>
            <div className="flex items-center justify-between max-w-md">
              <span className="text-xs md:text-sm text-[var(--color-text)]">Browser push notifications</span>
              <button 
                onClick={requestNotifications}
                className={`px-4 py-1 text-[10px] md:text-xs border ${notificationsEnabled ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]'}`}
              >
                {notificationsEnabled ? 'ENABLED' : 'AUTHORIZE'}
              </button>
            </div>
          </section>

          {/* Currency Settings */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase">
              <DollarSign className="w-5 h-5" /> Currency_Settings
            </h2>
            <div className="max-w-md">
              <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-2">DEFAULT_CURRENCY</label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {['INR', 'USD', 'EUR', 'GBP'].map(cur => (
                  <button
                    key={cur}
                    onClick={() => {
                      localStorage.setItem('hexis_currency', cur);
                      setCurrency(cur);
                      toast.success(`CURRENCY SET: ${cur}`);
                    }}
                    className={`px-4 py-2 border text-[10px] md:text-sm ${currency === cur ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]'} transition-colors`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Account Stats */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase">
              <Activity className="w-5 h-5" /> Account_Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
              {[
                { label: 'TASKS', value: stats.totalTasks },
                { label: 'DOCS', value: stats.totalDocs },
                { label: 'INVOICES', value: stats.totalInvoices },
              ].map((s, i) => (
                <div key={i} className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 text-center">
                  <p className="font-mono font-bold text-xl text-[var(--color-primary)]">
                    {s.value}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--color-muted)] mt-1">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[var(--color-muted)] mt-3">
              MEMBER SINCE: {memberSince}
            </p>
          </section>

          {/* Data */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase"><Database className="w-5 h-5" /> Data_Management</h2>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button onClick={exportData} className="flex-1 min-w-0 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> EXPORT_PAYLOAD
              </button>
              <button onClick={deleteData} className="flex-1 min-w-0 px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> PURGE_DATABASE
              </button>
            </div>
          </section>

          {/* Account Danger */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-danger)]/30 p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase text-[var(--color-danger)]">
              <AlertTriangle className="w-5 h-5" /> Danger_Zone
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <p className="text-xs md:text-sm text-[var(--color-text)]">PURGE_LOCAL_STORAGE</p>
                  <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Clears all local settings and cache</p>
                </div>
                <button onClick={deleteData} className="px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] transition-colors text-[10px] md:text-xs flex items-center gap-2 shrink-0">
                  <Trash2 className="w-3 h-3" /> PURGE
                </button>
              </div>
              <div className="flex items-center justify-between max-w-md">
                <div>
                  <p className="text-xs md:text-sm text-[var(--color-text)]">SIGN_OUT_ALL_DEVICES</p>
                  <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Revokes all active sessions</p>
                </div>
                <button onClick={async () => {
                  await supabase.auth.signOut({ scope: 'global' });
                  window.location.href = '/';
                }} className="px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] transition-colors text-[10px] md:text-xs flex items-center gap-2 shrink-0">
                  <LogOut className="w-3 h-3" /> SIGN OUT ALL
                </button>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-xs md:text-base font-bold mb-3 md:mb-4 uppercase"><Info className="w-5 h-5" /> System_Info</h2>
            <div className="space-y-2 text-[10px] md:text-sm text-[var(--color-muted)]">
              <p><span className="font-bold text-[var(--color-primary)]">VERSION:</span> 1.0.0-stable</p>
              <p><span className="font-bold text-[var(--color-primary)]">STACK:</span> React 19, Vite, Tailwind CSS, Supabase, TipTap, Recharts</p>
              <p><span className="font-bold text-[var(--color-primary)]">AUTHORIZATION:</span> Validated</p>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
