import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { StakingProgram } from '@/lib/staking';

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
  // Debug values for display
  debugAmount: number;
  debugAccRewardPerShare: number;
  debugRewardPerSharePaid: number;
  debugDelta: number;
}

export interface PoolData {
  acc_reward_per_share: number;
  total_staked: number;
  reward_rate: number;
  last_update: number; // epoch seconds
  token_decimals: number; // e.g., 1e9 for 9 decimals
}

export interface PositionData {
  amount: number;
  reward_per_share_paid: number;
  reward_owed: number;
}

// Calculate pending rewards (unused when reward_owed available): reward_owed + amount * (acc_reward_per_share - reward_per_share_paid) / PRECISION
export const calculatePendingRewards = (
  amount: number,
  poolAccRewardPerShare: number,
  positionRewardPerSharePaid: number,
  rewardOwed: number = 0
): number => {
  const delta = poolAccRewardPerShare - positionRewardPerSharePaid;
  const earned = (amount * delta) / PRECISION;
  const pending = rewardOwed + earned;
  return pending;
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
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet() as any;
  const { connection } = useConnection();
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
        reward_rate: 47619, // Reward rate for ~15% APR
        last_update: Math.floor(Date.now() / 1000) - 60, // Mock: last update 60s ago
        token_decimals: 1e9, // Assuming 9 decimals for SPL tokens
      };

      // Initialize staking program to fetch on-chain position (for reward_owed)
      const stakingProgram = new StakingProgram(connection, {
        publicKey,
        signTransaction,
        signAllTransactions,
      } as any);
      const onChainPosition = publicKey ? await stakingProgram.getUserPositionInfo(publicKey) : null;
      const rewardOwedOnChain = Number(onChainPosition?.rewardOwed ?? onChainPosition?.reward_owed ?? 0);

      const stakingPositions: StakingPosition[] = (positions || []).map(pos => {
        // Mock position data - in production, this would come from on-chain program
        const positionRewardPerSharePaid = 1000000000; // Mock value
        
        // Current timestamp and time since pool last update
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const secondsSinceLastUpdate = Math.max(0, currentTimestamp - poolData.last_update);
        const tokenDecimals = poolData.token_decimals ?? 1e9;
        
        // Calculate delta between pool and position
        const delta = poolData.acc_reward_per_share - positionRewardPerSharePaid;
        
        // Updated pending rewards formula:
        // reward_owed + amount * Delta * (currenttimestamp - pool.last_update) / Token.Decimal
        const pending = rewardOwedOnChain + (Number(pos.staked_amount) * delta * secondsSinceLastUpdate) / tokenDecimals;

        // Calculate APR using the same formula as Staking page
        const calculatedAPR = poolData.total_staked > 0 
          ? (poolData.reward_rate * 365 * 86400 * 100) / poolData.total_staked / 1e9
          : 15; // Fallback to 15% if calculation fails

        return {
          tokenMint: pos.token_mint,
          tokenSymbol: pos.token_symbol,
          tokenName: pos.token_name,
          stakedAmount: Number(pos.staked_amount),
          pendingRewards: pending,
          apy: calculatedAPR,
          lockPeriod: pos.lock_period,
          lockProgress: Number(pos.lock_progress),
          stakeDate: new Date(pos.stake_date),
          // Debug values
          debugAmount: Number(pos.staked_amount),
          debugAccRewardPerShare: poolData.acc_reward_per_share,
          debugRewardPerSharePaid: positionRewardPerSharePaid,
          debugDelta: poolData.acc_reward_per_share - positionRewardPerSharePaid,
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