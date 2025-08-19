-- Secure token_balances visibility by owner-only SELECT via profiles mapping

-- 1) Ensure a profiles table exists to map Supabase auth users to wallet addresses
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  wallet_address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper function to get the current user's wallet from profiles
CREATE OR REPLACE FUNCTION public.current_user_wallet()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid();
$$;

-- 3) Restrict SELECT on token_balances to owner only
-- Remove permissive public SELECT policy if present
DROP POLICY IF EXISTS "Token balances are viewable by everyone" ON public.token_balances;

-- Create owner-only SELECT policy
DROP POLICY IF EXISTS "Token balances are viewable by owner only" ON public.token_balances;
CREATE POLICY "Token balances are viewable by owner only"
  ON public.token_balances
  FOR SELECT
  TO authenticated
  USING (
    user_wallet IS NOT NULL AND user_wallet = public.current_user_wallet()
  );

-- NOTE: We intentionally leave existing INSERT/UPDATE policies unchanged to avoid breaking current write flows.
-- If you want to tighten them as well, we can add WITH CHECK policies mirroring the owner rule.