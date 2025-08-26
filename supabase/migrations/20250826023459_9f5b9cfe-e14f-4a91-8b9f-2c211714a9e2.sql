-- Create staking_positions table to store user staking positions
CREATE TABLE public.staking_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  staked_amount NUMERIC NOT NULL DEFAULT 0,
  pending_rewards NUMERIC NOT NULL DEFAULT 0,
  apy NUMERIC NOT NULL DEFAULT 15,
  lock_period INTEGER NOT NULL DEFAULT 30,
  lock_progress NUMERIC NOT NULL DEFAULT 0,
  stake_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_wallet, token_mint)
);

-- Enable Row Level Security
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own staking positions" 
ON public.staking_positions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own staking positions" 
ON public.staking_positions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own staking positions" 
ON public.staking_positions 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own staking positions" 
ON public.staking_positions 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_staking_positions_updated_at
BEFORE UPDATE ON public.staking_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();