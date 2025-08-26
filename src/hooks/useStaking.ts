import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

// Precision constant for reward calculations
const PRECISION = 1e9;

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

export interface PoolData {
  acc_reward_per_share: number;
  total_staked: number;
  reward_rate: number;
}

export interface PositionData {
  amount: number;
  reward_per_share_paid: number;
  reward_owed: number;
}

// Calculate pending rewards using the formula: reward_owed + amount * (acc_reward_per_share - reward_per_share_paid) / PRECISION
export const calculatePendingRewards = (
  amount: number,
  poolAccRewardPerShare: number,
  positionRewardPerSharePaid: number,
  rewardOwed: number = 0
): number => {
  const delta = poolAccRewardPerShare - positionRewardPerSharePaid;
  const earned = (amount * delta) / PRECISION;
  const pending = rewardOwed + earned;
  return pending < 0 ? 0 : pending;
};

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

      // Mock pool data - in production, this would come from on-chain program
      const poolData: PoolData = {
        acc_reward_per_share: 1500000000, // Mock value
        total_staked: 1000000, // Total staked in tokens
        reward_rate: 47619 // Reward rate for ~15% APR
      };

      const stakingPositions: StakingPosition[] = (positions || []).map(pos => {
        // Mock position data - in production, this would come from on-chain program
        const positionRewardPerSharePaid = 1000000000; // Mock value
        
        // Calculate pending rewards using the on-chain formula
        const calculatedPendingRewards = calculatePendingRewards(
          Number(pos.staked_amount),
          poolData.acc_reward_per_share,
          positionRewardPerSharePaid,
          Number(pos.pending_rewards || 0)
        );

        // Calculate APR using the same formula as Staking page
        const calculatedAPR = poolData.total_staked > 0 
          ? (poolData.reward_rate * 365 * 86400 * 100) / poolData.total_staked / 1e9
          : 15; // Fallback to 15% if calculation fails

        return {
          tokenMint: pos.token_mint,
          tokenSymbol: pos.token_symbol,
          tokenName: pos.token_name,
          stakedAmount: Number(pos.staked_amount),
          pendingRewards: calculatedPendingRewards,
          apy: calculatedAPR,
          lockPeriod: pos.lock_period,
          lockProgress: Number(pos.lock_progress),
          stakeDate: new Date(pos.stake_date),
        };
      });

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