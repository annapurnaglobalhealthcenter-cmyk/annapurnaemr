ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT 
GENERATED ALWAYS AS (TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) STORED;
