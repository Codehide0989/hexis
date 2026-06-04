-- HEXIS: Fix for Workspace Tasks Isolation
-- Run this in your Supabase SQL Editor to add the workspace_id column to the tasks table.

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.collab_workspaces(id) ON DELETE CASCADE;

-- Update/Create RLS policy for tasks table to support workspace task sharing
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "collab_tasks_policy" ON public.tasks;

CREATE POLICY "collab_tasks_policy" ON public.tasks
  FOR ALL
  USING (
    -- Either the user owns the task (personal tasks)
    auth.uid() = user_id
    OR 
    -- Or the task belongs to a workspace the user is a member of
    (workspace_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.collab_workspaces
        WHERE id = tasks.workspace_id AND owner_id = auth.uid()
      )
    ))
  )
  WITH CHECK (
    -- Ensure user can only insert/update tasks they own, or tasks in workspaces they are in
    auth.uid() = user_id
    OR
    (workspace_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.collab_workspaces
        WHERE id = tasks.workspace_id AND owner_id = auth.uid()
      )
    ))
  );
