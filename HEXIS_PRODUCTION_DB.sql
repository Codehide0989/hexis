-- Ensure core tables exist before altering them
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix 1: tasks table — status values wrong in DB
-- Code uses 'todo','in_progress','done'
-- But missing_tables.sql created 'pending','completed','cancelled'
-- Fix: drop old constraint, add correct one + migrate data

ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_status_check;

UPDATE tasks SET status = 'todo' 
  WHERE status = 'pending';
UPDATE tasks SET status = 'done' 
  WHERE status = 'completed';
UPDATE tasks SET status = 'todo' 
  WHERE status = 'cancelled';

ALTER TABLE tasks 
  ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('todo','in_progress','done'));

ALTER TABLE tasks 
  ALTER COLUMN status SET DEFAULT 'todo';

-- Fix 2: profiles table — add md5_hash if missing
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS md5_hash TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ 
  DEFAULT now();

-- Fix 3: kanban_cards — add column_id if missing
ALTER TABLE kanban_cards 
  ADD COLUMN IF NOT EXISTS column_id UUID 
  REFERENCES kanban_columns(id) ON DELETE SET NULL;

-- Fix 3.5: Ensure kanban_cards has all required columns
ALTER TABLE kanban_cards 
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'BACKLOG',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Fix 4: Create ALL missing tables with correct schemas

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

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS doc_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES doc_folders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collab_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT now(),
  logout_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix 5: Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- Fix 6: RLS Policies (drop first to avoid conflicts)
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
      pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Recreate all policies correctly
CREATE POLICY "own_data" ON profiles 
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "own_data" ON tasks 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON kanban_boards 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON kanban_columns 
  FOR ALL USING (
    board_id IN (
      SELECT id FROM kanban_boards 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "own_data" ON kanban_cards 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON calendar_events 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON invoices 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON transactions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON todos 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON reminders 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON docs 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON doc_folders 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON credentials_vault 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON goals 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_data" ON user_sessions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "workspace_access" ON collab_workspaces
  FOR ALL USING (
    auth.uid() = owner_id OR
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "member_access" ON workspace_members
  FOR ALL USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT id FROM collab_workspaces 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "public_read" ON system_announcements
  FOR SELECT USING (
    active = true AND 
    (expires_at IS NULL OR expires_at > now())
  );

-- Fix 7: Enable Realtime on all tables safely
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tasks', 'todos', 'invoices', 'transactions', 'reminders', 
    'kanban_cards', 'docs', 'calendar_events', 'credentials_vault'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', t);
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if already added
    END;
  END LOOP;
END $$;

-- Fix 8: Helper functions
CREATE OR REPLACE FUNCTION check_admin_exists()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE role = 'admin' LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 9: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_docs_updated_at ON docs;
CREATE TRIGGER update_docs_updated_at
  BEFORE UPDATE ON docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_credentials_updated_at ON credentials_vault;
CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON credentials_vault
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
