import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Copy, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../context/PlanContext';
import { UpgradeGate } from '../../components/ui/UpgradeGate';

export default function Vault() {
  const { user } = useAuth();
  const { canUse } = usePlan();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Form
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('General');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    
    loadVault();
    
    const channel = supabase
      .channel('module-vault-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credentials_vault',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadVault();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);

  const loadVault = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credentials_vault')
      .select('*')
      .eq('user_id', user.id)
      .order('site_name');
    if (data) setCredentials(data);
  };

  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const matchSearch = c.site_name.toLowerCase().includes(search.toLowerCase()) || c.username_val.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || (c.category && c.category.toUpperCase() === categoryFilter.toUpperCase());
      return matchSearch && matchCategory;
    });
  }, [credentials, search, categoryFilter]);

  const openModal = (cred?: any) => {
    if (cred) {
      setEditingId(cred.id);
      setSiteName(cred.site_name || '');
      setSiteUrl(cred.site_url || '');
      setUsername(cred.username_val || '');
      setPassword(atob(cred.password_val) || '');
      setCategory(cred.category || 'General');
      setNotes(cred.notes || '');
    } else {
      setEditingId(null);
      setSiteName('');
      setSiteUrl('');
      setUsername('');
      setPassword('');
      setCategory('General');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!user || !siteName || !password) return;
    
    const payload = {
      user_id: user.id,
      site_name: siteName,
      site_url: siteUrl,
      username_val: username,
      password_val: btoa(password),
      category,
      notes
    };

    if (editingId) {
      await supabase.from('credentials_vault').update(payload).eq('id', editingId).eq('user_id', user.id);
    } else {
      await supabase.from('credentials_vault').insert(payload);
    }
    
    loadVault();
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this credential?")) {
      await supabase.from('credentials_vault').delete().eq('id', id).eq('user_id', user?.id);
      loadVault();
    }
  };

  const toggleReveal = (id: string) => {
    const newSet = new Set(revealedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setRevealedIds(newSet);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generatePassword = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const pass = Array.from(array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
    setPassword(pass);
  };

  return (
    <UpgradeGate feature="Vault" requiredPlan="phantom" enabled={canUse('vault')}>
      <div className="p-4 md:p-6 bg-[#0a1a0f] min-h-full font-mono text-[#d8f3dc]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="text-[#52b788]" size={20} />
            <h1 className="font-mono font-bold text-2xl text-[#d8f3dc] uppercase tracking-wider">
              VAULT_SYSTEM
            </h1>
          </div>
          <button onClick={() => openModal()} className="px-4 py-2 bg-[#52b788] text-[#0a1a0f] font-bold text-xs hover:bg-[#74c69d] transition-colors flex items-center gap-2">
            <Plus size={14} /> ADD_ENTRY
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <div className="font-mono text-[#52b788] text-xl font-bold">{credentials.length} ENTRIES</div>
            <div className="text-[#95d5b2] text-xs">TOTAL STORED</div>
          </div>
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <div className="font-mono text-[#52b788] text-xl font-bold">{new Set(credentials.map(c => c.category).filter(Boolean)).size || 0}</div>
            <div className="text-[#95d5b2] text-xs">CATEGORIES</div>
          </div>
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <div className="font-mono text-[#52b788] text-xl font-bold">AES-256</div>
            <div className="text-[#95d5b2] text-xs">ENCRYPTION</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="QUERY_DATABASE..."
            className="flex-1 bg-black border border-[#1b4332] px-4 py-2 text-sm focus:border-[#52b788] outline-none text-[#52b788] w-full"
          />
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="sm:w-40 bg-black border border-[#1b4332] px-4 py-2 text-sm focus:border-[#52b788] outline-none text-[#52b788] w-full"
          >
            {['ALL', 'SOCIAL', 'WORK', 'FINANCE', 'EMAIL', 'OTHER'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          {filteredCredentials.length === 0 && (
            <div className="text-[#95d5b2] text-sm text-center py-8">No records found.</div>
          )}
          {filteredCredentials.map(cred => (
            <div key={cred.id} className="bg-[#0d2818] border border-[#1b4332] p-4 mb-2 hover:border-[#52b788] transition-colors group">
              <div className="flex items-center justify-between">
                
                {/* LEFT */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 shrink-0 bg-[#0a1a0f] border border-[#1b4332] flex items-center justify-center font-mono font-bold text-sm text-[#52b788]">
                    {cred.site_name ? cred.site_name[0].toUpperCase() : '?'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-mono text-sm text-[#d8f3dc] truncate">{cred.site_name}</div>
                    <div className="font-mono text-xs text-[#95d5b2] mt-0.5 truncate">{cred.username_val}</div>
                    {cred.site_url && (
                      <div 
                        className="font-mono text-[10px] text-[#2d6a4f] hover:text-[#52b788] cursor-pointer mt-0.5 truncate"
                        onClick={() => window.open(cred.site_url.startsWith('http') ? cred.site_url : 'https://' + cred.site_url, '_blank')}
                      >
                        {cred.site_url}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => copyText(cred.username_val)}
                    className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-[#1b4332] hover:border-[#52b788]" 
                    title="Copy username"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => copyText(atob(cred.password_val))}
                    className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-[#1b4332] hover:border-[#52b788]" 
                    title="Copy password"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={() => toggleReveal(cred.id)}
                    className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-[#1b4332] hover:border-[#52b788]"
                  >
                    {revealedIds.has(cred.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button 
                    onClick={() => openModal(cred)}
                    className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-[#1b4332] hover:border-[#52b788]"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cred.id)}
                    className="p-1.5 text-[#e63946] hover:bg-[#e63946]/10 border border-[#1b4332] hover:border-[#e63946]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              
              {revealedIds.has(cred.id) && (
                <div className="font-mono text-xs text-[#52b788] bg-[#0a1a0f] px-2 py-1 border border-[#1b4332] mt-2 inline-block">
                  {atob(cred.password_val)}
                </div>
              )}
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d2818] border border-[#52b788] p-6 w-full max-w-md">
              <h2 className="font-mono font-bold text-lg text-[#d8f3dc] mb-6">
                {editingId ? '[ EDIT_ENTRY ]' : '[ ADD_ENTRY ]'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">SITE NAME</label>
                  <input 
                    type="text" 
                    value={siteName} 
                    onChange={e => setSiteName(e.target.value)} 
                    className="w-full bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788]" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">SITE URL</label>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    value={siteUrl} 
                    onChange={e => setSiteUrl(e.target.value)} 
                    className="w-full bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788]" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">USERNAME / EMAIL</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="w-full bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788]" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">PASSWORD</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="flex-1 bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788]" 
                    />
                    <button 
                      onClick={generatePassword} 
                      className="px-3 border border-[#1b4332] text-[#95d5b2] hover:border-[#52b788] hover:text-[#52b788] text-xs transition-colors shrink-0"
                    >
                      GENERATE
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">CATEGORY</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788]"
                  >
                    {['General', 'Social', 'Work', 'Finance', 'Email', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1">NOTES</label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    className="w-full bg-black border border-[#1b4332] p-2 text-sm text-[#52b788] focus:outline-none focus:border-[#52b788] min-h-[80px] resize-y" 
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={closeModal} 
                  className="flex-1 py-2 border border-[#1b4332] text-[#95d5b2] hover:border-[#52b788] transition-colors text-sm font-bold"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex-1 py-2 bg-[#52b788] text-[#0a1a0f] hover:bg-[#74c69d] transition-colors text-sm font-bold"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UpgradeGate>
  );
}
