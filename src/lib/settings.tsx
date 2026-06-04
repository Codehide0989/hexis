import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { logAdminAction } from '../admin/lib/adminAuth';
import toast from 'react-hot-toast';

export type SettingsMap = Record<string, any>;

interface SettingsContextType {
  settings: SettingsMap;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true,
  refreshSettings: async () => { },
  updateSetting: async () => false,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      // First try standard select. If RLS blocks anon reads, we fallback to RPC
      const { data, error } = await supabase.from('app_settings').select('key, value');

      if (error) {
        // Fallback to secure RPC tunnel for public settings read
        const rpcRes = await supabase.rpc('get_public_settings');
        if (rpcRes.error) throw rpcRes.error;
        if (rpcRes.data) {
          const map: SettingsMap = {};
          rpcRes.data.forEach((s: any) => map[s.key] = s.value);
          setSettings(map);
          return;
        }
        throw error;
      }

      if (data) {
        const map: SettingsMap = {};
        data.forEach(s => { map[s.key] = s.value });
        setSettings(map);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
      // Failsafe fallback defaults
      setSettings(prev => Object.keys(prev).length > 0 ? prev : {
        app_name: 'Hexis',
        maintenance_mode: false,
        allow_signups: true,
        feature_tasks: true,
        feature_kanban: true,
        feature_calendar: true,
        feature_invoices: true,
        feature_docs: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // Subscribe to realtime changes on app_settings so all active clients get config updates instantly
    const channel = supabase.channel('app-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        fetchSettings();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateSetting = async (key: string, value: any) => {
    try {
      const adminId = localStorage.getItem('admin_id');
      if (!adminId) throw new Error('Not authenticated as admin');

      const { error } = await supabase.rpc('admin_update_setting', {
        p_admin_id: adminId,
        p_key: key,
        p_value: value
      });

      if (error) throw error;

      // Update local state immediately for snappy UI
      setSettings(prev => ({ ...prev, [key]: value }));
      await logAdminAction(adminId, 'UPDATE_SETTING', 'setting', key, { new_value: value });
      return true;
    } catch (e: any) {
      console.error('Failed to update setting:', e);
      toast.error('Failed to update setting: ' + e.message);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};
