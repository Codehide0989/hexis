CREATE OR REPLACE FUNCTION verify_user_login(
  p_username TEXT,
  p_md5_hash TEXT
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  md5_hash TEXT,
  is_banned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.md5_hash, 
         COALESCE(p.is_banned, false)
  FROM profiles p
  WHERE p.username = p_username
    AND p.md5_hash = p_md5_hash
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
