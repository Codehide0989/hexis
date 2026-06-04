import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Lock, Activity, Bell, Database, Info, Eye, EyeOff, Save, Download, Trash2, DollarSign, AlertTriangle, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useRealtimeData } from '../../hooks/useRealtimeData';

export default function Settings() {
  const { user } = useAuth();
  const [username, setUsername] = useState('OPERATOR_01');
  const [isSaving, setIsSaving] = useState(false);
  const [md5Key, setMd5Key] = useState('NO_KEY_FOUND');
  const [showKey, setShowKey] = useState(false);
  const [currency, setCurrency] = useState(localStorage.getItem('hexis_currency') || 'INR');
  
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
    
    loadProfile();
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
      <div className="max-w-4xl mx-auto p-3 md:p-6 font-mono text-[var(--color-text)] min-h-full space-y-8">
        
        <div className="border-b border-[var(--color-border)] pb-4 mb-6">
          <h1 className="text-lg md:text-2xl font-bold tracking-widest uppercase">SYSTEM_SETTINGS</h1>
        </div>

        <div className="grid gap-4 md:p-8">
          
          {/* Profile */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase"><User className="w-5 h-5" /> Profile_Configuration</h2>
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
                  <button onClick={handleSaveProfile} disabled={isSaving} className="px-4 py-2 border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] transition-colors flex items-center gap-2 text-[var(--color-primary)]">
                    <Save className="w-4 h-4" />
                    {isSaving ? 'SYNCING...' : 'APPLY'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase"><Shield className="w-5 h-5" /> Security_Keys</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-[10px] md:text-xs text-[var(--color-muted)] mb-1">MD5_ACCESS_TOKEN</label>
                <div className="flex items-center justify-between w-full bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2">
                  <span className="tracking-widest font-bold text-[var(--color-text)] overflow-hidden text-ellipsis">
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase">
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase"><Bell className="w-5 h-5" /> System_Alerts</h2>
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase">
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase">
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase"><Database className="w-5 h-5" /> Data_Management</h2>
            <div className="flex flex-wrap gap-4">
              <button onClick={exportData} className="px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-bg)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> EXPORT_PAYLOAD
              </button>
              <button onClick={deleteData} className="px-4 py-2 border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> PURGE_DATABASE
              </button>
            </div>
          </section>

          {/* Account Danger */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-danger)]/30 p-4 md:p-6">
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase text-[var(--color-danger)]">
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
            <h2 className="flex items-center gap-2 text-sm md:text-lg font-bold mb-4 uppercase"><Info className="w-5 h-5" /> System_Info</h2>
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
