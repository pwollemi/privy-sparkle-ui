import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface StakingPosition {
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  stakedAmount: number;
  pendingRewards: number;
  apy: number;
  lockPeriod: number;
  lockProgress: number;
  stakeDate: Date;
}

export interface UseStakingReturn {
  stakedPositions: StakingPosition[];
  totalStaked: number;
  totalRewards: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStaking = (): UseStakingReturn => {
  const { connected, publicKey } = useWallet();
  const [stakedPositions, setStakedPositions] = useState<StakingPosition[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStakingData = async () => {
    if (!connected || !publicKey) {
      setStakedPositions([]);
      setTotalStaked(0);
      setTotalRewards(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual staking data fetching from Solana program
      // For now, using mock data for demonstration
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockPositions: StakingPosition[] = [
        {
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          tokenSymbol: 'USDC',
          tokenName: 'USD Coin',
          stakedAmount: 1000,
          pendingRewards: 12.5,
          apy: 15,
          lockPeriod: 30,
          lockProgress: 65,
          stakeDate: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 days ago
        },
        {
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
          stakedAmount: 50,
          pendingRewards: 2.3,
          apy: 12,
          lockPeriod: 60,
          lockProgress: 25,
          stakeDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        },
      ];

      setStakedPositions(mockPositions);
      
      // Calculate totals (assuming $1 per token for simplicity)
      const totalStakedValue = mockPositions.reduce((sum, pos) => sum + pos.stakedAmount, 0);
      const totalRewardsValue = mockPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
      
      setTotalStaked(totalStakedValue);
      setTotalRewards(totalRewardsValue);

    } catch (error) {
      console.error('Failed to fetch staking data:', error);
      setError('Failed to fetch staking data');
      setStakedPositions([]);
      setTotalStaked(0);
      setTotalRewards(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStakingData();
  }, [connected, publicKey]);

  return {
    stakedPositions,
    totalStaked,
    totalRewards,
    isLoading,
    error,
    refetch: fetchStakingData,
  };
};