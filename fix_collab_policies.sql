-- Allow any authenticated user to find a workspace 
-- by invite_code (needed for /join flow)
DROP POLICY IF EXISTS "workspace_access" ON collab_workspaces;

CREATE POLICY "workspace_read_by_invite" 
  ON collab_workspaces FOR SELECT
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR is_active = true  -- allows finding by invite_code
  );

CREATE POLICY "workspace_insert_owner"
  ON collab_workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "workspace_update_owner"
  ON collab_workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

-- Allow members to read workspace_members of their workspace
DROP POLICY IF EXISTS "member_access" ON workspace_members;
DROP POLICY IF EXISTS "own_data" ON workspace_members;

CREATE POLICY "member_read_own_workspace"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "member_insert"
  ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_delete_own"
  ON workspace_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT id FROM collab_workspaces 
      WHERE owner_id = auth.uid()
    )
  );
