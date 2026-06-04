-- TABLE: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: kanban_boards
CREATE TABLE IF NOT EXISTS kanban_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: kanban_columns
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: kanban_cards
CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'BACKLOG',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "users_own_profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_boards" ON kanban_boards FOR ALL USING (auth.uid() = user_id);

-- For kanban columns, they belong to boards which belong to users
CREATE POLICY "users_own_columns" ON kanban_columns FOR ALL USING (
  board_id IN (SELECT id FROM kanban_boards WHERE user_id = auth.uid())
);

-- For kanban cards, they belong to the user
CREATE POLICY "users_own_cards" ON kanban_cards FOR ALL USING (auth.uid() = user_id);
