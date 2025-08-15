-- Create function to get active traders in 24h
CREATE OR REPLACE FUNCTION public.get_active_traders_24h(token_mint_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  trader_count INTEGER;
BEGIN
  -- Count unique traders (from price_history transaction signatures) in last 24h
  WITH twentyfour_hours_ago AS (
    SELECT NOW() - INTERVAL '24 hours' AS cutoff_time
  )
  SELECT COUNT(DISTINCT 
    CASE 
      WHEN transaction_signature IS NOT NULL THEN transaction_signature
      ELSE NULL 
    END
  ) INTO trader_count
  FROM price_history, twentyfour_hours_ago
  WHERE token_mint = token_mint_param
    AND timestamp >= cutoff_time
    AND transaction_signature IS NOT NULL;
  
  RETURN COALESCE(trader_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;