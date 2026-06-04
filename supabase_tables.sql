-- TABLE 1: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#52b788',
  location TEXT,
  repeat_type TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 2: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft','sent','paid','overdue')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 3: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 4: todos
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- TABLE 5: reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  repeat_type TEXT DEFAULT 'none'
    CHECK (repeat_type IN ('none','daily','weekly','monthly')),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 6: docs
CREATE TABLE IF NOT EXISTS docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled Document',
  content TEXT DEFAULT '',
  folder TEXT DEFAULT 'root',
  is_pinned BOOLEAN DEFAULT false,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 7: doc_folders
CREATE TABLE IF NOT EXISTS doc_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES doc_folders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 8: credentials_vault
CREATE TABLE IF NOT EXISTS credentials_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  site_url TEXT,
  username_val TEXT,
  password_val TEXT NOT NULL,
  notes TEXT,
  category TEXT DEFAULT 'general',
  is_favorite BOOLEAN DEFAULT false,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 9: collab_workspaces
CREATE TABLE IF NOT EXISTS collab_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 10: workspace_members
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES collab_workspaces(id) 
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer'
    CHECK (role IN ('owner','editor','viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- TABLE 11: system_announcements
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info'
    CHECK (type IN ('info','warning','danger')),
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 12: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT now(),
  logout_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- TABLE 13: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  md5_hash TEXT NOT NULL,
  email TEXT,
  is_super_admin BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 14: app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (key, value, category) VALUES
  ('app_name', '"HEXIS"', 'general'),
  ('app_version', '"1.0.0"', 'general'),
  ('allow_signups', 'true', 'security'),
  ('require_md5_login', 'true', 'security'),
  ('maintenance_mode', 'false', 'general'),
  ('max_users', '10000', 'security'),
  ('features_enabled', '{
    "tasks":true,"kanban":true,"calendar":true,
    "invoices":true,"finance":true,"vault":true,
    "docs":true,"collab":true,"analytics":true,
    "reminders":true,"todos":true
  }', 'features')
ON CONFLICT (key) DO NOTHING;

-- TABLE 15: admin_logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE 16: goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(12,2),
  current_value DECIMAL(12,2) DEFAULT 0,
  unit TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','completed','abandoned')),
  category TEXT DEFAULT 'personal',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Make sure we don't error out on existing RLS policies
DO $$
BEGIN
  BEGIN
    ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE collab_workspaces ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
  
  BEGIN
    ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN END;
END $$;

-- Drop policies to avoid "policy already exists" errors when recreating
DROP POLICY IF EXISTS "users_own_data" ON calendar_events;
DROP POLICY IF EXISTS "users_own_data" ON invoices;
DROP POLICY IF EXISTS "users_own_data" ON transactions;
DROP POLICY IF EXISTS "users_own_data" ON todos;
DROP POLICY IF EXISTS "users_own_data" ON reminders;
DROP POLICY IF EXISTS "users_own_data" ON docs;
DROP POLICY IF EXISTS "users_own_data" ON doc_folders;
DROP POLICY IF EXISTS "users_own_data" ON credentials_vault;
DROP POLICY IF EXISTS "users_own_data" ON goals;
DROP POLICY IF EXISTS "owners_and_members" ON collab_workspaces;
DROP POLICY IF EXISTS "announcements_public_read" ON system_announcements;

CREATE POLICY "users_own_data" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON invoices
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON transactions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON todos
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON reminders
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON docs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON doc_folders
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON credentials_vault
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON goals
  FOR ALL USING (auth.uid() = user_id);
-- 1. Clean slate: remove all existing policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'collab_workspaces' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collab_workspaces', pol.policyname);
    END LOOP;
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
    END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Collab workspaces policies separated to avoid INSERT recursion
CREATE POLICY "collab_workspaces_select" ON collab_workspaces FOR SELECT USING (
  auth.uid() = owner_id OR is_workspace_member(id)
);
CREATE POLICY "collab_workspaces_insert" ON collab_workspaces FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
CREATE POLICY "collab_workspaces_update" ON collab_workspaces FOR UPDATE USING (
  auth.uid() = owner_id
);
CREATE POLICY "collab_workspaces_delete" ON collab_workspaces FOR DELETE USING (
  auth.uid() = owner_id
);

-- 3. Workspace members policies
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT USING (true);
CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workspace_members_update" ON workspace_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "announcements_public_read" 
  ON system_announcements FOR SELECT 
  USING (active = true);

CREATE OR REPLACE FUNCTION check_admin_exists()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql;



