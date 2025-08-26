import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

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
      const walletAddress = publicKey.toString();
      
      // Fetch staking positions from Supabase
      const { data: positions, error: fetchError } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('user_wallet', walletAddress)
        .gt('staked_amount', 0);

      if (fetchError) {
        throw new Error(`Failed to fetch staking positions: ${fetchError.message}`);
      }

      const stakingPositions: StakingPosition[] = (positions || []).map(pos => ({
        tokenMint: pos.token_mint,
        tokenSymbol: pos.token_symbol,
        tokenName: pos.token_name,
        stakedAmount: Number(pos.staked_amount),
        pendingRewards: Number(pos.pending_rewards),
        apy: Number(pos.apy),
        lockPeriod: pos.lock_period,
        lockProgress: Number(pos.lock_progress),
        stakeDate: new Date(pos.stake_date),
      }));

      setStakedPositions(stakingPositions);
      
      // Calculate totals
      const totalStakedValue = stakingPositions.reduce((sum, pos) => sum + pos.stakedAmount, 0);
      const totalRewardsValue = stakingPositions.reduce((sum, pos) => sum + pos.pendingRewards, 0);
      
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