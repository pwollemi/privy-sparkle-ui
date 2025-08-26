-- Secure staking_positions with owner-only RLS using wallet mapping
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can create their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can delete their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can update their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can view their own staking positions" ON public.staking_positions;

-- Owner-scoped policies via current_user_wallet() mapping from profiles
CREATE POLICY "Users can view their own staking positions"
ON public.staking_positions
FOR SELECT
TO authenticated
USING (user_wallet = public.current_user_wallet());

CREATE POLICY "Users can insert their own staking positions"
ON public.staking_positions
FOR INSERT
TO authenticated
WITH CHECK (user_wallet = public.current_user_wallet());

CREATE POLICY "Users can update their own staking positions"
ON public.staking_positions
FOR UPDATE
TO authenticated
USING (user_wallet = public.current_user_wallet())
WITH CHECK (user_wallet = public.current_user_wallet());

CREATE POLICY "Users can delete their own staking positions"
ON public.staking_positions
FOR DELETE
TO authenticated
USING (user_wallet = public.current_user_wallet());