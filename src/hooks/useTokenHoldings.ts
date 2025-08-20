import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

export interface TokenHolding {
  token_mint: string;
  balance: number;
  last_updated: string;
  token: {
    name: string;
    symbol: string;
    image_url: string | null;
    base_mint: string;
  } | null;
}

export interface UseTokenHoldingsReturn {
  holdings: TokenHolding[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTokenHoldings = (): UseTokenHoldingsReturn => {
  const { publicKey, connected } = useWallet();
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldings = async () => {
    if (!connected || !publicKey) {
      setHoldings([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toString();
      
      // First get token balances
      const { data: balancesData, error: balancesError } = await supabase
        .from('token_balances')
        .select('token_mint, balance, last_updated')
        .eq('user_wallet', walletAddress)
        .gt('balance', 0);

      if (balancesError) {
        console.error('Error fetching token balances:', balancesError);
        setError('Failed to fetch token balances');
        setHoldings([]);
        return;
      }

      if (!balancesData || balancesData.length === 0) {
        setHoldings([]);
        return;
      }

      // Get token mints from balances
      const tokenMints = balancesData.map(b => b.token_mint);

      // Get token details for these mints
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('base_mint, name, symbol, image_url')
        .in('base_mint', tokenMints);

      if (tokensError) {
        console.error('Error fetching token details:', tokensError);
        setError('Failed to fetch token details');
        setHoldings([]);
        return;
      }

      // Combine the data
      const transformedData: TokenHolding[] = balancesData.map(balance => {
        const tokenInfo = tokensData?.find(token => token.base_mint === balance.token_mint);
        return {
          token_mint: balance.token_mint,
          balance: Number(balance.balance),
          last_updated: balance.last_updated,
          token: tokenInfo ? {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            image_url: tokenInfo.image_url,
            base_mint: tokenInfo.base_mint
          } : null
        };
      });

      setHoldings(transformedData);
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setError('Failed to fetch token holdings');
      setHoldings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [connected, publicKey]);

  return {
    holdings,
    isLoading,
    error,
    refetch: fetchHoldings
  };
};