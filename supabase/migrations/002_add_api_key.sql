-- Migration 002: Add API key column and OAuth exchange function

-- Enable pgcrypto for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add api_key column to profiles (for Zapier webhook authentication)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Create unique index for API key lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_api_key ON public.profiles(api_key) WHERE api_key IS NOT NULL;

-- Function to generate a new API key for a user
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_key TEXT;
  user_id UUID := auth.uid();
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate a cryptographically random API key (vir_ prefix for Virlo)
  new_key := 'vir_' || encode(gen_random_bytes(24), 'hex');

  UPDATE public.profiles
  SET api_key = new_key
  WHERE id = user_id;

  RETURN new_key;
END;
$$;

-- Allow users to call generate_api_key
GRANT EXECUTE ON FUNCTION public.generate_api_key() TO authenticated;
