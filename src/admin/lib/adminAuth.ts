import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  is_super_admin: boolean;
}

export const checkAdminExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_admin_exists');
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking if admin exists:', error);
    return false;
  }
};

export const adminLogin = async (username: string, passwordText: string, md5Key: string) => {
  try {
    // We query by username using RPC to bypass RLS for unauthenticated users
    const { data: adminData, error } = await supabase
      .rpc('get_admin_for_login', { p_username: username });

    if (error) {
      console.error('RPC Error:', error);
      throw new Error('Database connection error');
    }
    if (!adminData || adminData.length === 0) {
      console.error('Admin user not found for username:', username);
      throw new Error('Invalid credentials');
    }

    const adminUser = adminData[0];

    // Check MD5 Key FIRST (fast check)
    if (!md5Key || adminUser.md5_hash !== md5Key.trim()) {
      throw new Error('INVALID ACCESS KEY');
    }

    // Check Password with bcrypt
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(
        passwordText, 
        adminUser.password_hash
      );
    } catch (bcryptErr) {
      console.error('bcrypt error:', bcryptErr);
      throw new Error('PASSWORD VERIFICATION FAILED');
    }
    
    if (!passwordMatch) {
      throw new Error('INVALID CREDENTIALS');
    }

    // Generate a simple token (in a real app, this should be a secure JWT signed by server)
    // For now, since they are bypassing standard auth, we'll store a mock token and ID
    const sessionToken = `${adminUser.id}-${Date.now()}`;
    
    // Note: Because we are NOT using Supabase Auth, the client is technically 'anon'
    // Therefore, standard RLS will block these updates unless we use an RPC.
    // We wrap these in a try-catch so they don't break the login flow.
    try {
      await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', adminUser.id);
      await logAdminAction(adminUser.id, 'ADMIN_LOGIN', 'system', adminUser.id, { ip: 'client' });
    } catch (e) {
      console.warn('Failed to update last_login or log action due to RLS:', e);
    }

    // Store in localStorage and sessionStorage
    localStorage.setItem('admin_token', sessionToken);
    localStorage.setItem('admin_id', adminUser.id);
    localStorage.setItem('admin_username', adminUser.username);
    sessionStorage.setItem('admin_token', sessionToken);
    sessionStorage.setItem('admin_id', adminUser.id);
    sessionStorage.setItem('admin_username', adminUser.username);

    return adminUser;
  } catch (error: any) {
    console.error('Admin login failed:', error);
    throw error;
  }
};

export const adminLogout = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_id');
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_id');
};

export const isAdminAuthenticated = (): boolean => {
  return !!localStorage.getItem('admin_token') && !!sessionStorage.getItem('admin_token');
};

export const getCurrentAdmin = async (): Promise<AdminUser | null> => {
  const adminId = localStorage.getItem('admin_id');
  const adminUsername = localStorage.getItem('admin_username');
  if (!adminId || !adminUsername) return null;

  try {
    // We use the same RPC to bypass RLS since the client is anon
    const { data, error } = await supabase
      .rpc('get_admin_for_login', { p_username: adminUsername });

    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch (error) {
    console.error('Failed to get current admin:', error);
    return null;
  }
};

export const logAdminAction = async (
  adminId: string,
  action: string,
  targetType: 'user' | 'setting' | 'system' | 'user_subscriptions' | 'global',
  targetId?: string,
  details?: any
) => {
  try {
    const { error } = await supabase.rpc('admin_log_action', {
      p_admin_id: adminId,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId || null,
      p_details: details || {}
    });

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
};
