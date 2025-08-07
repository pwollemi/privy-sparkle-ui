import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export interface WalletBalance {
  sol: number;
  isLoading: boolean;
  error: string | null;
}

export const useWalletBalance = (): WalletBalance => {
  const { authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [balance, setBalance] = useState<WalletBalance>({
    sol: 0,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    console.log('Wallet debug:', { authenticated, wallets, firstWallet: wallets[0] });
    
    const wallet = wallets[0];
    const address = wallet?.address;
    
    if (!authenticated || !wallets.length || !address) {
      setBalance({ sol: 0, isLoading: false, error: null });
      return;
    }

    const fetchBalance = async () => {
      setBalance(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const publicKey = new PublicKey(address);
        const solBalance = await connection.getBalance(publicKey);
        
        setBalance({
          sol: solBalance / LAMPORTS_PER_SOL,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
        setBalance({
          sol: 0,
          isLoading: false,
          error: 'Failed to fetch balance',
        });
      }
    };

    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(interval);
  }, [authenticated, wallets]);

  return balance;
};