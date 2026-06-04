-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    md5_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read" ON public.profiles;
CREATE POLICY "Allow public inserts" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read" ON public.profiles FOR SELECT USING (true);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- 3. Kanban Cards Table
CREATE TABLE IF NOT EXISTS public.kanban_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'TODO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kanban RLS
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own kanban cards" ON public.kanban_cards;
CREATE POLICY "Users can manage own kanban cards" ON public.kanban_cards FOR ALL USING (auth.uid() = user_id);

-- 4. Vault Files Table
CREATE TABLE IF NOT EXISTS public.vault_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vault RLS
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own vault files" ON public.vault_files;
CREATE POLICY "Users can manage own vault files" ON public.vault_files FOR ALL USING (auth.uid() = user_id);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
CREATE POLICY "Users can manage own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- 6. Finance Transactions Table
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC DEFAULT 0,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Finance RLS
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own finance transactions" ON public.finance_transactions;
CREATE POLICY "Users can manage own finance transactions" ON public.finance_transactions FOR ALL USING (auth.uid() = user_id);

-- 7. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Calendar RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own calendar events" ON public.calendar_events;
CREATE POLICY "Users can manage own calendar events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

-- 8. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activity Logs RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own activity logs" ON public.activity_logs;
CREATE POLICY "Users can manage own activity logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);
