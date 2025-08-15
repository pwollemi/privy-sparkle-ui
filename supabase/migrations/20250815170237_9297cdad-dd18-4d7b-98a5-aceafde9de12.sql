-- Create price_history table to track token prices over time
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_mint TEXT NOT NULL,
  price_sol DECIMAL(20, 10) NOT NULL,
  volume_sol DECIMAL(20, 10) DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_type TEXT CHECK (transaction_type IN ('buy', 'sell')),
  transaction_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view price history
CREATE POLICY "Price history is viewable by everyone" 
ON public.price_history 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to insert price history
CREATE POLICY "Anyone can insert price history" 
ON public.price_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_price_history_token_mint ON public.price_history(token_mint);
CREATE INDEX idx_price_history_timestamp ON public.price_history(timestamp);
CREATE INDEX idx_price_history_token_timestamp ON public.price_history(token_mint, timestamp);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;