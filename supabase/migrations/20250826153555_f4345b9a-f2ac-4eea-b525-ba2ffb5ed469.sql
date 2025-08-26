-- 1) Fix RLS on token_balances to restrict to owner only
-- Drop overly permissive existing policies
DROP POLICY IF EXISTS "Token balances are viewable by everyone" ON public.token_balances;
DROP POLICY IF EXISTS "Anyone can insert token balances" ON public.token_balances;
DROP POLICY IF EXISTS "Anyone can update token balances" ON public.token_balances;

-- Create owner-scoped policies using wallet mapping from profiles via current_user_wallet()
CREATE POLICY "Users can view their own token balances"
ON public.token_balances
FOR SELECT
TO authenticated
USING (user_wallet = public.current_user_wallet());

CREATE POLICY "Users can insert their own token balances"
ON public.token_balances
FOR INSERT
TO authenticated
WITH CHECK (user_wallet = public.current_user_wallet());

CREATE POLICY "Users can update their own token balances"
ON public.token_balances
FOR UPDATE
TO authenticated
USING (user_wallet = public.current_user_wallet())
WITH CHECK (user_wallet = public.current_user_wallet());

-- 2) Ensure profiles upsert works reliably
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles (user_id);
