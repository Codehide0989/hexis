-- ============================================================
-- HEXIS COMPLETE DATABASE RESET & FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- WARNING: This wipes admin_users and resets for fresh setup
-- ============================================================

-- STEP 1: Delete existing admin so setup wizard works fresh
DELETE FROM admin_logs;
DELETE FROM admin_users;

-- STEP 2: Create/fix check_admin_exists function
DROP FUNCTION IF EXISTS check_admin_exists();
CREATE OR REPLACE FUNCTION check_admin_exists()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create/fix get_admin_for_login function (bypasses RLS)
DROP FUNCTION IF EXISTS get_admin_for_login(TEXT);
CREATE OR REPLACE FUNCTION get_admin_for_login(p_username TEXT)
RETURNS TABLE(
  id UUID,
  username TEXT,
  email TEXT,
  password_hash TEXT,
  md5_hash TEXT,
  is_super_admin BOOLEAN,
  last_login TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id, a.username, a.email,
    a.password_hash, a.md5_hash,
    a.is_super_admin, a.last_login
  FROM admin_users a
  WHERE a.username = p_username
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create/fix admin_log_action function
DROP FUNCTION IF EXISTS admin_log_action(UUID, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION admin_log_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_details);
EXCEPTION WHEN OTHERS THEN
  NULL; -- silently ignore log errors
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Fix admin_users table structure
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  md5_hash TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 6: Fix admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 7: Fix profiles table - ensure all columns exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS md5_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS discord_id TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 8: Fix user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'covert'
    CHECK (plan IN ('covert','phantom','apex')),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','cancelled','expired')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_subscription" ON user_subscriptions;
CREATE POLICY "own_subscription" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- STEP 9: Discord sync table
CREATE TABLE IF NOT EXISTS discord_sync_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  discord_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 10: Discord link codes table (for /link command)
CREATE TABLE IF NOT EXISTS discord_link_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE discord_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_link_codes" ON discord_link_codes
  FOR ALL USING (auth.uid() = user_id);

-- STEP 11: Add discord_id to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS discord_id TEXT;

-- STEP 12: Fix RLS on admin tables (admins bypass via functions)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "admin_users_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_logs_policy" ON admin_logs;

-- Admin users: no direct client access (only via SECURITY DEFINER functions)
CREATE POLICY "admin_users_no_direct_access" ON admin_users
  FOR ALL USING (false);

CREATE POLICY "admin_logs_no_direct_access" ON admin_logs
  FOR ALL USING (false);

-- STEP 13: Auto-create subscription on signup
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'covert', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- STEP 14: Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE discord_sync_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- STEP 15: Search users function for bot/admin
DROP FUNCTION IF EXISTS search_users_by_username(TEXT);
CREATE OR REPLACE FUNCTION search_users_by_username(search_term TEXT)
RETURNS TABLE(id UUID, username TEXT, plan TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, COALESCE(s.plan, 'covert') as plan
  FROM profiles p
  LEFT JOIN user_subscriptions s ON s.user_id = p.id
  WHERE p.username ILIKE '%' || search_term || '%'
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 16: Get user plan by discord_id (for bot)
DROP FUNCTION IF EXISTS get_user_by_discord_id(TEXT);
CREATE OR REPLACE FUNCTION get_user_by_discord_id(p_discord_id TEXT)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  plan TEXT,
  is_banned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, COALESCE(s.plan, 'covert'), COALESCE(p.is_banned, false)
  FROM profiles p
  LEFT JOIN user_subscriptions s ON s.user_id = p.id
  WHERE p.discord_id = p_discord_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 17: Consume discord link code (for /link command)
DROP FUNCTION IF EXISTS consume_discord_link_code(TEXT, TEXT);
CREATE OR REPLACE FUNCTION consume_discord_link_code(
  p_code TEXT,
  p_discord_id TEXT
)
RETURNS TABLE(user_id UUID, username TEXT, plan TEXT) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find valid code
  SELECT dlc.user_id INTO v_user_id
  FROM discord_link_codes dlc
  WHERE dlc.code = p_code
    AND dlc.used = false
    AND dlc.expires_at > now()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Mark code as used
  UPDATE discord_link_codes SET used = true WHERE code = p_code;

  -- Link discord_id to profile
  UPDATE profiles SET discord_id = p_discord_id WHERE id = v_user_id;

  -- Return user info
  RETURN QUERY
  SELECT p.id, p.username, COALESCE(s.plan, 'covert')
  FROM profiles p
  LEFT JOIN user_subscriptions s ON s.user_id = p.id
  WHERE p.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
