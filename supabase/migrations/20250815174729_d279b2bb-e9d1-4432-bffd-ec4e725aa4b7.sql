-- Add user_wallet column to price_history to track unique traders
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS user_wallet TEXT;

-- Create index for better performance when querying by user_wallet
CREATE INDEX IF NOT EXISTS idx_price_history_user_wallet ON public.price_history(user_wallet);
CREATE INDEX IF NOT EXISTS idx_price_history_token_wallet ON public.price_history(token_mint, user_wallet);