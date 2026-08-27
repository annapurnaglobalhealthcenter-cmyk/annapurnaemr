ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
