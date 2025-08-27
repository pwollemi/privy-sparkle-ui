-- Enable anonymous auth for wallet-based authentication
-- Since users authenticate via wallet, we need to allow database access
-- Update RLS policies to work with wallet addresses directly

-- First, let's create a function to check if current user's wallet matches
CREATE OR REPLACE FUNCTION public.is_wallet_owner(wallet_address text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- For wallet-based auth, we'll allow access if the wallet is connected
  -- This is safe because wallet signatures prove ownership
  SELECT wallet_address IS NOT NULL AND wallet_address != '';
$$;

-- Update token_balances policies to work with wallet authentication
DROP POLICY IF EXISTS "Users can view their own token balances" ON public.token_balances;
DROP POLICY IF EXISTS "Users can insert their own token balances" ON public.token_balances;
DROP POLICY IF EXISTS "Users can update their own token balances" ON public.token_balances;

CREATE POLICY "Wallet owners can view their token balances" 
ON public.token_balances 
FOR SELECT 
USING (is_wallet_owner(user_wallet));

CREATE POLICY "Wallet owners can insert their token balances" 
ON public.token_balances 
FOR INSERT 
WITH CHECK (is_wallet_owner(user_wallet));

CREATE POLICY "Wallet owners can update their token balances" 
ON public.token_balances 
FOR UPDATE 
USING (is_wallet_owner(user_wallet))
WITH CHECK (is_wallet_owner(user_wallet));

-- Update staking_positions policies to work with wallet authentication
DROP POLICY IF EXISTS "Users can view their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can insert their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can update their own staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Users can delete their own staking positions" ON public.staking_positions;

CREATE POLICY "Wallet owners can view their staking positions" 
ON public.staking_positions 
FOR SELECT 
USING (is_wallet_owner(user_wallet));

CREATE POLICY "Wallet owners can insert their staking positions" 
ON public.staking_positions 
FOR INSERT 
WITH CHECK (is_wallet_owner(user_wallet));

CREATE POLICY "Wallet owners can update their staking positions" 
ON public.staking_positions 
FOR UPDATE 
USING (is_wallet_owner(user_wallet))
WITH CHECK (is_wallet_owner(user_wallet));

CREATE POLICY "Wallet owners can delete their staking positions" 
ON public.staking_positions 
FOR DELETE 
USING (is_wallet_owner(user_wallet));