-- Remove initial_supply column from tokens table since all tokens now have fixed 100M supply
ALTER TABLE public.tokens DROP COLUMN IF EXISTS initial_supply;

-- Create token_balances table to track user holdings
CREATE TABLE public.token_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    token_mint TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_wallet, token_mint)
);

-- Enable RLS on token_balances
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for token_balances
CREATE POLICY "Token balances are viewable by everyone" 
ON public.token_balances 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert token balances" 
ON public.token_balances 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update token balances" 
ON public.token_balances 
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_token_balances_token_mint ON public.token_balances(token_mint);
CREATE INDEX idx_token_balances_user_wallet ON public.token_balances(user_wallet);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_token_balances_updated_at
BEFORE UPDATE ON public.token_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();