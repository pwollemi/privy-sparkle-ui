import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
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
  const { connection } = useConnection();
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
      console.log('Fetching holdings for wallet:', walletAddress);

      // Fetch all SPL token accounts (Token and Token-2022) from-chain
      const [standardTokens, token2022Tokens] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID }),
      ]);

      const allAccounts = [...standardTokens.value, ...token2022Tokens.value];
      console.log('Found token accounts:', allAccounts.length);

      // Aggregate balances by mint
      const balancesMap = new Map<string, number>();
      for (const acc of allAccounts) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed: any = acc.account.data.parsed;
          const info = parsed?.info;
          const mint: string | undefined = info?.mint;
          const uiAmount: number = Number(info?.tokenAmount?.uiAmount ?? 0);
          if (!mint || !uiAmount || uiAmount <= 0) continue;
          balancesMap.set(mint, (balancesMap.get(mint) ?? 0) + uiAmount);
        } catch (e) {
          console.warn('Failed to parse token account', e);
        }
      }

      const tokenMints = Array.from(balancesMap.keys());
      console.log('Mints with balance > 0:', tokenMints);

      if (tokenMints.length === 0) {
        setHoldings([]);
        return;
      }

      // Fetch metadata for these mints from public tokens table (publicly readable)
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('base_mint, name, symbol, image_url')
        .in('base_mint', tokenMints);

      if (tokensError) {
        console.error('Error fetching token details:', tokensError);
      }

      const nowIso = new Date().toISOString();
      const transformedData: TokenHolding[] = tokenMints.map((mint) => {
        const tokenInfo = tokensData?.find((t) => t.base_mint === mint) ?? null;
        return {
          token_mint: mint,
          balance: Number(balancesMap.get(mint) ?? 0),
          last_updated: nowIso,
          token: tokenInfo
            ? {
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                image_url: tokenInfo.image_url,
                base_mint: tokenInfo.base_mint,
              }
            : null,
        };
      });

      console.log('Final transformed data:', transformedData);
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
    refetch: fetchHoldings,
  };
};
