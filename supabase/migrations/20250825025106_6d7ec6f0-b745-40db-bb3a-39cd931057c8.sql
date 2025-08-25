-- Update token_balances RLS policy to allow public access
-- This is needed because the portfolio feature is public-facing and authentication is not implemented yet

DROP POLICY IF EXISTS "Token balances are viewable by owner only" ON token_balances;

-- Create a new policy that allows anyone to view token balances
CREATE POLICY "Token balances are viewable by everyone" 
ON token_balances 
FOR SELECT 
USING (true);