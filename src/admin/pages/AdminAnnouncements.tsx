import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Megaphone, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  target: 'ALL' | 'COVERT' | 'PHANTOM' | 'APEX';
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'danger',
    target: 'ALL' as 'ALL' | 'COVERT' | 'PHANTOM' | 'APEX',
    active: true,
    expires_at: ''
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_announcements').select('*').order('created_at', { ascending: false });
      if (error) {
        // Fallback to RPC if RLS blocks
        const rpcRes = await supabase.rpc('admin_get_announcements', { p_admin_id: localStorage.getItem('admin_id') });
        if (rpcRes.error) throw rpcRes.error;
        if (rpcRes.data) setAnnouncements(rpcRes.data);
      } else {
        setAnnouncements(data || []);
      }
    } catch (e: any) {
      toast.error('Failed to load announcements');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const adminId = localStorage.getItem('admin_id');
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target: formData.target,
        active: formData.active,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };
      
      if (editingId) {
        const { error } = await supabase.rpc('admin_update_announcement', { p_admin_id: adminId, p_id: editingId, ...payload });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('admin_create_announcement', { p_admin_id: adminId, ...payload });
        if (error) throw error;
      }
      toast.success(editingId ? 'Announcement Updated' : 'Announcement Broadcasted');
      setModalOpen(false);
      fetchAnnouncements();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.rpc('admin_delete_announcement', { p_admin_id: localStorage.getItem('admin_id'), p_id: id });
      toast.success('Announcement Deleted');
      fetchAnnouncements();
    } catch (e: any) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setFormData({ 
      title: ann.title, 
      message: ann.message, 
      type: ann.type, 
      target: ann.target || 'ALL',
      active: ann.active,
      expires_at: ann.expires_at ? new Date(ann.expires_at).toISOString().slice(0, 16) : ''
    });
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ title: '', message: '', type: 'info', target: 'ALL', active: true, expires_at: '' });
    setModalOpen(true);
  };

  return (
    <div className="font-mono text-[#d8f3dc] max-w-5xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl text-[#74c69d] uppercase tracking-widest font-bold flex items-center gap-2">
          <Megaphone /> System Broadcasts
        </h2>
        <button onClick={openCreate} className="bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-4 py-2 uppercase tracking-widest text-xs font-bold flex items-center gap-2 transition-colors rounded">
          <Plus size={16} /> New Broadcast
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1b4332] rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1b4332]/20 border-b border-[#1b4332]">
            <tr>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Title</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Type</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Target</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Created</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Expires</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase">Status</th>
              <th className="p-4 text-xs tracking-widest text-[#52b788] uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b4332]/50">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-[#52b788] uppercase">Loading...</td></tr>
            ) : announcements.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-[#1b4332] uppercase">No Broadcasts Active</td></tr>
            ) : (
              announcements.map(ann => (
                <tr key={ann.id} className={`hover:bg-[#1b4332]/10 transition-colors ${!ann.active ? 'opacity-50' : ''}`}>
                  <td className="p-4 font-bold">{ann.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] tracking-widest uppercase border rounded-sm ${
                      ann.type === 'info' ? 'bg-blue-900/30 text-blue-500 border-blue-900' :
                      ann.type === 'warning' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900' :
                      'bg-red-900/30 text-red-500 border-red-900'
                    }`}>
                      {ann.type}
                    </span>
                  </td>
                  <td className="p-4 text-[#52b788] text-xs font-bold">{ann.target || 'ALL'}</td>
                  <td className="p-4 text-[#52b788] text-xs">{format(new Date(ann.created_at), 'dd MMM yyyy')}</td>
                  <td className="p-4 text-[#52b788] text-xs">{ann.expires_at ? format(new Date(ann.expires_at), 'dd MMM yyyy HH:mm') : 'Never'}</td>
                  <td className="p-4">
                    {ann.active ? (
                      <span className="text-green-500 text-xs uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> Live</span>
                    ) : (
                      <span className="text-gray-500 text-xs uppercase tracking-widest">Offline</span>
                    )}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(ann)} className="p-2 text-[#52b788] hover:text-[#d8f3dc] hover:bg-[#1b4332] rounded transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(ann.id)} className="p-2 text-red-500 hover:bg-red-900/30 rounded transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#1b4332] rounded w-full max-w-lg p-6 space-y-6">
            <h3 className="text-xl text-[#74c69d] tracking-widest uppercase font-bold border-b border-[#1b4332] pb-4">
              {editingId ? 'Edit Broadcast' : 'New Broadcast'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none" />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Message</label>
                <textarea rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none uppercase text-sm">
                    <option value="info">INFO</option>
                    <option value="warning">WARNING</option>
                    <option value="danger">CRITICAL / DANGER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Target Audience</label>
                  <select value={formData.target} onChange={e => setFormData({...formData, target: e.target.value as any})} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none uppercase text-sm">
                    <option value="ALL">ALL USERS</option>
                    <option value="COVERT">COVERT ONLY</option>
                    <option value="PHANTOM">PHANTOM ONLY</option>
                    <option value="APEX">APEX ONLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">Expires At (Optional)</label>
                  <input type="datetime-local" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} className="w-full bg-[#050505] border border-[#1b4332] p-3 text-[#d8f3dc] focus:border-[#74c69d] focus:outline-none text-sm" />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <button onClick={() => setFormData({...formData, active: !formData.active})} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${formData.active ? 'bg-[#74c69d]' : 'bg-[#1b4332]'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.active ? 'translate-x-6' : ''}`} />
                  </button>
                  <span className="text-xs uppercase tracking-widest text-[#52b788]">Active</span>
                </div>
              </div>
            </div>

            {/* PREVIEW */}
            <div className="pt-4">
              <label className="block text-xs uppercase tracking-widest text-[#52b788] mb-2">User Preview</label>
              <div className={`p-4 border flex items-start gap-3 rounded ${
                formData.type === 'info' ? 'bg-blue-900/10 border-blue-900 text-blue-500' :
                formData.type === 'warning' ? 'bg-yellow-900/10 border-yellow-900 text-yellow-500' :
                'bg-red-900/10 border-red-900 text-red-500'
              }`}>
                {formData.type === 'info' ? <Info size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                <div>
                  <h4 className="font-bold uppercase tracking-widest text-sm">{formData.title || 'BROADCAST TITLE'}</h4>
                  <p className="text-xs mt-1 opacity-80">{formData.message || 'Broadcast message content will appear here.'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-[#1b4332]">
              <button onClick={() => setModalOpen(false)} className="flex-1 p-3 text-[#52b788] hover:bg-[#1b4332] uppercase text-sm tracking-widest transition-colors rounded">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] p-3 uppercase text-sm tracking-widest font-bold transition-colors rounded">
                {editingId ? 'Update' : 'Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
