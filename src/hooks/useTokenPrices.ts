import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TokenPrice {
  token_mint: string;
  price_sol: number;
  timestamp: string;
}

export const useTokenPrices = (tokenMints: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useTokenPrices effect triggered with mints:', tokenMints);
    if (tokenMints.length === 0) {
      console.log('No token mints provided, resetting prices');
      setPrices({});
      setIsLoading(false);
      return;
    }

    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);
      console.log('Fetching prices for token mints:', tokenMints);

      try {
        // Get latest price for each token
        const { data, error: supabaseError } = await supabase
          .from('price_history')
          .select('token_mint, price_sol, timestamp')
          .in('token_mint', tokenMints)
          .order('timestamp', { ascending: false });

        if (supabaseError) {
          console.error('Error fetching token prices:', supabaseError);
          setError('Failed to fetch token prices');
          setIsLoading(false);
          return;
        }

        console.log('Price history data:', data);

        // Get the latest price for each token
        const latestPrices: Record<string, number> = {};
        data?.forEach(item => {
          if (!latestPrices[item.token_mint]) {
            latestPrices[item.token_mint] = Number(item.price_sol);
          }
        });

        console.log('Latest prices:', latestPrices);
        setPrices(latestPrices);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to fetch token prices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [JSON.stringify(tokenMints)]); // Use JSON.stringify to avoid infinite re-renders

  return { prices, isLoading, error };
};