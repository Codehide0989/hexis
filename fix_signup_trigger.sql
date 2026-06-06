-- 1. Fix the new user profile trigger to be completely bulletproof
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, md5_hash)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'md5_hash'
  )
  -- If profile already exists (e.g. from manual insert), just update it to link it
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    md5_hash = EXCLUDED.md5_hash;
    
  RETURN new;
EXCEPTION WHEN unique_violation THEN
  -- If username already exists for someone else, add a random suffix so it doesn't crash the whole auth signup
  INSERT INTO public.profiles (id, username, md5_hash)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '_' || substr(md5(random()::text), 1, 4),
    new.raw_user_meta_data->>'md5_hash'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger securely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Make sure the subscription trigger is also safe
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'covert', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail instead of crashing user signup
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the subscription trigger
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();
