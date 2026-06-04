-- HEXIS: Fix for Workspace Join via Invite Code
-- Run this in your Supabase SQL Editor to allow users to join via invite code securely.

CREATE OR REPLACE FUNCTION public.join_workspace_by_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ws_id uuid;
BEGIN
    -- 1. Find the workspace using the invite code
    SELECT id INTO v_ws_id
    FROM public.collab_workspaces
    WHERE invite_code = p_invite_code;

    -- 2. If no workspace found, throw an error
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;

    -- 3. Add the currently authenticated user as a member (if not already)
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_ws_id, auth.uid(), 'viewer')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- 4. Return the workspace ID back to the client
    RETURN v_ws_id;
END;
$$;
