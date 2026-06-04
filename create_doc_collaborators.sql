CREATE TABLE doc_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID REFERENCES docs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  permission TEXT DEFAULT 'editor' CHECK (permission IN ('editor','viewer')),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doc_id, user_id)
);
