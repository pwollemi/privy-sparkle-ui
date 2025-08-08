import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface WalletBalance {
  sol: number;
  isLoading: boolean;
  error: string | null;
}

export const useWalletBalance = (): WalletBalance => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<WalletBalance>({
    sol: 0,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connected || !publicKey) {
        setBalance({ sol: 0, isLoading: false, error: null });
        return;
      }

      setBalance(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance({ sol: lamports / LAMPORTS_PER_SOL, isLoading: false, error: null });
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
        setBalance({ sol: 0, isLoading: false, error: 'Failed to fetch balance' });
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  return balance;
};