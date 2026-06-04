import { supabase } from './supabase';

export { supabase };

export type Profile = {
  id?: string;
  username: string;
  md5_hash: string;
  created_at?: string;
};
