-- Add target column if it doesn't exist
ALTER TABLE system_announcements ADD COLUMN IF NOT EXISTS target TEXT DEFAULT 'ALL';

-- 1. Get Announcements
CREATE OR REPLACE FUNCTION admin_get_announcements(p_admin_id UUID)
RETURNS SETOF system_announcements AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can view all announcements';
  END IF;

  RETURN QUERY SELECT * FROM system_announcements ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Announcement
CREATE OR REPLACE FUNCTION admin_create_announcement(
  p_admin_id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  target TEXT,
  active BOOLEAN,
  expires_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create announcements';
  END IF;

  INSERT INTO system_announcements (title, message, type, target, active, expires_at)
  VALUES (admin_create_announcement.title, admin_create_announcement.message, admin_create_announcement.type, admin_create_announcement.target, admin_create_announcement.active, admin_create_announcement.expires_at)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Announcement
CREATE OR REPLACE FUNCTION admin_update_announcement(
  p_admin_id UUID,
  p_id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  target TEXT,
  active BOOLEAN,
  expires_at TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update announcements';
  END IF;

  UPDATE system_announcements
  SET 
    title = admin_update_announcement.title,
    message = admin_update_announcement.message,
    type = admin_update_announcement.type,
    target = admin_update_announcement.target,
    active = admin_update_announcement.active,
    expires_at = admin_update_announcement.expires_at
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Delete Announcement
CREATE OR REPLACE FUNCTION admin_delete_announcement(
  p_admin_id UUID,
  p_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete announcements';
  END IF;

  DELETE FROM system_announcements WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
