-- HEXIS: Fix for Admin Dashboard Plan Fetching
-- Run this in your Supabase SQL Editor to allow admins to securely fetch user subscription data without RLS blocking them.

CREATE OR REPLACE FUNCTION public.admin_get_subscriptions(p_admin_id uuid)
RETURNS TABLE (
    user_id uuid,
    plan text,
    status text,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Verify that the requester is a valid admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_admin_id) THEN
        RAISE EXCEPTION 'Unauthorized admin access';
    END IF;

    -- 2. Return all subscriptions, bypassing the standard RLS policy
    RETURN QUERY 
    SELECT s.user_id, s.plan, s.status, s.updated_at 
    FROM public.user_subscriptions s;
END;
$$;
