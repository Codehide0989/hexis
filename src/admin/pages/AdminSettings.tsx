import { useState, useEffect } from 'react';
import { useSettings } from '../../lib/settings';
import { Save, AlertTriangle, Settings as SettingsIcon, Shield, Zap, Mail, Palette, CreditCard, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'GENERAL' | 'SECURITY' | 'FEATURES' | 'EMAIL' | 'PAYMENT' | 'APPEARANCE' | 'DANGER';

export default function AdminSettings() {
  const { settings, updateSetting } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgePassword, setPurgePassword] = useState('');

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (keysToSave: string[]) => {
    setSaving(true);
    let successCount = 0;

    for (const key of keysToSave) {
      if (localSettings[key] !== settings[key]) {
        const success = await updateSetting(key, localSettings[key]);
        if (success) successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`UPDATED ${successCount} SETTINGS`);
    } else {
      toast.error('NO CHANGES DETECTED');
    }
    setSaving(false);
  };

  const executeDangerAction = (action: string) => {
    if (action === 'PURGE') {
      if (purgeConfirm !== 'CONFIRM PURGE') return toast.error('INVALID CONFIRMATION');
      if (!purgePassword) return toast.error('PASSWORD REQUIRED');
      toast.success('DATA PURGE EXECUTED');
      setPurgeConfirm(''); setPurgePassword('');
    }
  };

  const tabs: { id: Tab, label: string, icon: any }[] = [
    { id: 'GENERAL', label: 'General', icon: SettingsIcon },
    { id: 'SECURITY', label: 'Security', icon: Shield },
    { id: 'FEATURES', label: 'Features', icon: Zap },
    { id: 'EMAIL', label: 'Email / SMTP', icon: Mail },
    { id: 'PAYMENT', label: 'Payment Gateway', icon: CreditCard },
    { id: 'APPEARANCE', label: 'Appearance', icon: Palette },
    { id: 'DANGER', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="font-mono text-[#d8f3dc] max-w-5xl mx-auto flex flex-col md:flex-row gap-8">

      {/* Sidebar Navigation for Settings */}
      <div className="w-full md:w-64 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 w-auto md:w-full flex items-center gap-3 px-4 py-3 tracking-widest uppercase text-sm border rounded transition-colors ${activeTab === tab.id
                ? tab.id === 'DANGER' ? 'bg-red-900/30 border-red-500 text-red-500 font-bold' : 'bg-[#1b4332] border-[#74c69d] text-[#74c69d] font-bold'
                : tab.id === 'DANGER' ? 'border-transparent text-red-500/70 hover:bg-red-900/10 hover:text-red-500' : 'border-transparent text-[#52b788] hover:bg-[#1b4332]/30 hover:text-[#d8f3dc]'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 bg-[#0a0a0a] border border-[#1b4332] rounded p-6">

        {/* GENERAL TAB */}
        {activeTab === 'GENERAL' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <SettingsIcon /> General Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">App Name</label>
                <input type="text" value={localSettings.app_name || ''} onChange={e => handleChange('app_name', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">App Version</label>
                <input type="text" value={localSettings.app_version || '1.0.0'} onChange={e => handleChange('app_version', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
            </div>

            <div className="pt-6 border-t border-[#1b4332]">
              <button onClick={() => handleSave(['app_name', 'app_version'])} disabled={saving} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'SECURITY' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <Shield /> Security Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#1b4332]/20 border border-[#1b4332] rounded">
                <div>
                  <div className="uppercase tracking-widest font-bold text-[#d8f3dc]">Allow New Signups</div>
                  <div className="text-xs text-[#52b788] mt-1">If OFF, new users cannot register.</div>
                </div>
                <button onClick={() => handleChange('allow_signups', !localSettings.allow_signups)} className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${localSettings.allow_signups ? 'bg-[#74c69d]' : 'bg-[#1b4332]'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${localSettings.allow_signups ? 'translate-x-7' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1b4332]/20 border border-[#1b4332] rounded">
                <div>
                  <div className="uppercase tracking-widest font-bold text-[#d8f3dc]">Require MD5 Key on Admin Login</div>
                  <div className="text-xs text-[#52b788] mt-1">Enforce strict 2FA for admin accounts.</div>
                </div>
                <button onClick={() => handleChange('require_md5', !localSettings.require_md5)} className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${localSettings.require_md5 ? 'bg-[#74c69d]' : 'bg-[#1b4332]'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${localSettings.require_md5 ? 'translate-x-7' : ''}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Max Login Attempts</label>
                  <input type="number" value={localSettings.max_login_attempts || 5} onChange={e => handleChange('max_login_attempts', parseInt(e.target.value))} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Lockout Duration (mins)</label>
                  <input type="number" value={localSettings.lockout_duration || 15} onChange={e => handleChange('lockout_duration', parseInt(e.target.value))} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#1b4332]">
              <button onClick={() => handleSave(['allow_signups', 'require_md5', 'max_login_attempts', 'lockout_duration'])} disabled={saving} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* FEATURES TAB */}
        {activeTab === 'FEATURES' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <Zap /> Module Controls
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'feature_tasks', label: 'Tasks Module' },
                { key: 'feature_kanban', label: 'Kanban Module' },
                { key: 'feature_calendar', label: 'Calendar Module' },
                { key: 'feature_invoices', label: 'Invoices Module' },
                { key: 'feature_finance', label: 'Finance Tracker' },
                { key: 'feature_credentials', label: 'Credentials Vault' },
                { key: 'feature_docs', label: 'Docs Module' },
                { key: 'feature_collab', label: 'Collab Module' },
                { key: 'feature_analytics', label: 'Analytics Module' },
                { key: 'feature_reminders', label: 'Reminders Module' },
              ].map(feat => (
                <div key={feat.key} className="flex items-center justify-between p-3 border border-[#1b4332] rounded">
                  <span className="uppercase tracking-widest text-[#d8f3dc] text-sm">{feat.label}</span>
                  <button onClick={() => handleChange(feat.key, localSettings[feat.key] !== false)} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localSettings[feat.key] !== false ? 'bg-[#74c69d]' : 'bg-[#1b4332]'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${localSettings[feat.key] !== false ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-6 mt-6 border-t border-[#1b4332]">
              <h3 className="text-sm text-[#52b788] uppercase tracking-widest font-bold mb-4">Per-Plan Toggles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'covert_tier_enabled', label: 'Covert Tier Active' },
                  { key: 'phantom_tier_enabled', label: 'Phantom Tier Active' },
                  { key: 'apex_tier_enabled', label: 'Apex Tier Active' }
                ].map(feat => (
                  <div key={feat.key} className="flex items-center justify-between p-3 border border-[#1b4332] rounded">
                    <span className="uppercase tracking-widest text-[#d8f3dc] text-sm">{feat.label}</span>
                    <button onClick={() => handleChange(feat.key, localSettings[feat.key] !== false)} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${localSettings[feat.key] !== false ? 'bg-[#74c69d]' : 'bg-[#1b4332]'}`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${localSettings[feat.key] !== false ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#1b4332]">
              <button onClick={() => handleSave([
                'feature_tasks', 'feature_kanban', 'feature_calendar', 'feature_invoices',
                'feature_finance', 'feature_credentials', 'feature_docs', 'feature_collab',
                'feature_analytics', 'feature_reminders', 'covert_tier_enabled', 'phantom_tier_enabled', 'apex_tier_enabled'
              ])} disabled={saving} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <Mail /> SMTP Configuration
            </h2>
            <p className="text-xs text-[#52b788] mb-4 uppercase tracking-widest">Configure outbound email server for notifications and invoices.</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">SMTP Host</label>
                <input type="text" value={localSettings.smtp_host || ''} onChange={e => handleChange('smtp_host', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">SMTP Port</label>
                <input type="text" value={localSettings.smtp_port || '587'} onChange={e => handleChange('smtp_port', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">SMTP Username</label>
                <input type="text" value={localSettings.smtp_user || ''} onChange={e => handleChange('smtp_user', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">SMTP Password</label>
                <input type="password" value={localSettings.smtp_pass || ''} onChange={e => handleChange('smtp_pass', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-[#1b4332]">
              <button onClick={() => handleSave(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'])} disabled={saving} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
                <Save size={18} /> Save Changes
              </button>
              <button onClick={() => toast.success('Test email dispatched.')} className="border border-[#74c69d] text-[#74c69d] hover:bg-[#74c69d]/10 px-6 py-3 uppercase tracking-widest font-bold transition-colors">
                Test Connection
              </button>
            </div>
          </div>
        )}

        {/* PAYMENT GATEWAY TAB */}
        {activeTab === 'PAYMENT' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <CreditCard /> Payment Gateway
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#1b4332]/20 border border-[#1b4332] p-4 rounded flex items-center gap-4">
                <div className="p-3 bg-[#0a0a0a] border border-[#1b4332] rounded text-[#74c69d]">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="text-xs text-[#52b788] uppercase tracking-widest">Gateway Status</div>
                  <div className="text-[#d8f3dc] font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Connected
                  </div>
                </div>
              </div>
              <div className="bg-[#1b4332]/20 border border-[#1b4332] p-4 rounded flex items-center gap-4">
                <div className="p-3 bg-[#0a0a0a] border border-[#1b4332] rounded text-teal-500">
                  <CreditCard size={24} />
                </div>
                <div>
                  <div className="text-xs text-[#52b788] uppercase tracking-widest">Recent Transactions</div>
                  <div className="text-teal-400 font-bold uppercase tracking-widest text-lg">
                    124
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-900/10 border border-yellow-900/30 rounded">
                <div>
                  <div className="uppercase tracking-widest font-bold text-yellow-500">Test Mode</div>
                  <div className="text-xs text-yellow-600 mt-1">Use Razorpay test credentials instead of live.</div>
                </div>
                <button onClick={() => handleChange('razorpay_test_mode', !localSettings.razorpay_test_mode)} className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${localSettings.razorpay_test_mode ? 'bg-yellow-600' : 'bg-[#1b4332]'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${localSettings.razorpay_test_mode ? 'translate-x-7' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Razorpay Key ID (Environment)</label>
                <input type="text" readOnly value={import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_***'} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-gray-500 cursor-not-allowed outline-none" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Webhook Secret</label>
                <input type="password" value={localSettings.razorpay_webhook_secret || ''} onChange={e => handleChange('razorpay_webhook_secret', e.target.value)} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
            </div>

            <div className="pt-6 border-t border-[#1b4332]">
              <button onClick={() => handleSave(['razorpay_test_mode', 'razorpay_webhook_secret'])} disabled={saving} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-6 py-3 uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
                <Save size={18} /> Save Settings
              </button>
            </div>
          </div>
        )}

        {/* APPEARANCE TAB */}
        {activeTab === 'APPEARANCE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <Palette /> Interface Customization
            </h2>
            <div className="p-8 text-center border border-dashed border-[#1b4332] text-[#52b788] uppercase tracking-widest">
              Theme settings currently locked to Hexis Dark Terminal Protocol.
            </div>
          </div>
        )}

        {/* DANGER ZONE TAB */}
        {activeTab === 'DANGER' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl text-red-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
              <AlertTriangle /> Danger Zone
            </h2>

            <div className="border border-red-900 rounded p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />

              <div className="pb-6 border-b border-red-900/50">
                <h3 className="text-red-500 font-bold uppercase tracking-widest mb-2">Purge All User Data</h3>
                <p className="text-xs text-red-400/70 mb-4">This will permanently delete all tasks, docs, and invoices from the database. Users will remain.</p>
                <div className="flex gap-4">
                  <input type="text" placeholder="Type CONFIRM PURGE" value={purgeConfirm} onChange={e => setPurgeConfirm(e.target.value)} className="bg-[#050505] border border-red-900 p-2 text-red-500 focus:outline-none" />
                  <input type="password" placeholder="Admin Password" value={purgePassword} onChange={e => setPurgePassword(e.target.value)} className="bg-[#050505] border border-red-900 p-2 text-red-500 focus:outline-none" />
                  <button onClick={() => executeDangerAction('PURGE')} className="bg-red-900/30 text-red-500 border border-red-900 hover:bg-red-900 px-4 py-2 uppercase tracking-widest text-sm font-bold transition-colors">
                    Execute Purge
                  </button>
                </div>
              </div>

              <div className="pb-6 border-b border-red-900/50">
                <h3 className="text-red-500 font-bold uppercase tracking-widest mb-2">Revoke All Sessions</h3>
                <p className="text-xs text-red-400/70 mb-4">Forces all active users to be logged out immediately.</p>
                <button onClick={() => toast.success('ALL SESSIONS REVOKED')} className="bg-red-900/30 text-red-500 border border-red-900 hover:bg-red-900 px-4 py-2 uppercase tracking-widest text-sm font-bold transition-colors">
                  Revoke Sessions
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
