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
  debugRewardOwed: number;
  debugTimeSinceUpdate: number;
  debugTokenDecimals: number;
  debugPendingCalculation: number;
  debugPoolLastUpdate: number;
  debugCurrentTimestamp: number;
  debugIsZeroDelta: boolean;
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
      
      // Ensure Supabase session and link profile to wallet for RLS owner checks
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No Supabase session, signing in anonymously...');
          await supabase.auth.signInAnonymously();
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .upsert(
              { user_id: user.id, wallet_address: walletAddress },
              { onConflict: 'user_id' }
            );
        }
      } catch (authErr) {
        console.warn('Supabase auth/profile setup failed:', authErr);
      }
      
      // Fetch staking positions from Supabase
      const { data: positions, error: fetchError } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('user_wallet', walletAddress)
        .gt('staked_amount', 0);

      if (fetchError) {
        throw new Error(`Failed to fetch staking positions: ${fetchError.message}`);
      }

      // Fetch real pool data from on-chain program
      const stakingProgram = new StakingProgram(connection, {
        publicKey,
        signTransaction,
        signAllTransactions,
      } as any);
      
      let poolData: PoolData;
      let onChainPosition: any = null;
      
      try {
        // Fetch actual pool data from the program
        const poolInfo = await stakingProgram.getPoolInfo();
        onChainPosition = publicKey ? await stakingProgram.getUserPositionInfo(publicKey) : null;
        
        poolData = {
          acc_reward_per_share: Number(poolInfo?.accRewardPerShare ?? poolInfo?.acc_reward_per_share ?? 1500000000),
          total_staked: Number(poolInfo?.totalStaked ?? poolInfo?.total_staked ?? 1000000),
          reward_rate: Number(poolInfo?.rewardRate ?? poolInfo?.reward_rate ?? 47619),
          last_update: Number(poolInfo?.lastUpdateTime ?? poolInfo?.last_update_time ?? Math.floor(Date.now() / 1000)),
          token_decimals: 1e6, // 1,000,000 decimals as specified
        };
      } catch (error) {
        console.warn('Failed to fetch pool data, using fallback values:', error);
        // Fallback to mock data if on-chain fetch fails
        poolData = {
          acc_reward_per_share: 1500000000,
          total_staked: 1000000,
          reward_rate: 47619,
          last_update: Math.floor(Date.now() / 1000) - 60, // 60s ago as fallback
          token_decimals: 1e6, // 1,000,000 decimals as specified
        };
        onChainPosition = publicKey ? await stakingProgram.getUserPositionInfo(publicKey).catch(() => null) : null;
      }

      const rewardOwedOnChain = Number(onChainPosition?.rewardOwed ?? onChainPosition?.reward_owed ?? 0);

      const stakingPositions: StakingPosition[] = (positions || []).map(pos => {
        // Use on-chain position amount instead of database staked_amount
        const onChainAmount = Number(onChainPosition?.amount ?? pos.staked_amount);
        const positionRewardPerSharePaid = Number(onChainPosition?.rewardPerSharePaid ?? onChainPosition?.reward_per_share_paid ?? 1000000000);
        
        // Current timestamp and time since pool last update
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const secondsSinceLastUpdate = Math.max(0, currentTimestamp - poolData.last_update);
        const tokenDecimals = poolData.token_decimals ?? 1e6;
        
        // Calculate delta between pool and position
        const delta = poolData.acc_reward_per_share - positionRewardPerSharePaid;
        
        // Updated pending rewards formula with zero-delta branch
        const isZeroDelta = delta === 0;
        const calcPart = isZeroDelta
          ? (poolData.acc_reward_per_share * secondsSinceLastUpdate) / tokenDecimals
          : (onChainAmount * delta * secondsSinceLastUpdate) / tokenDecimals;
        const pending = rewardOwedOnChain + calcPart;

        // Calculate APR using the same formula as Staking page
        const calculatedAPR = poolData.total_staked > 0 
          ? (poolData.reward_rate * 365 * 86400 * 100) / poolData.total_staked / 1e9
          : 15; // Fallback to 15% if calculation fails

        return {
          tokenMint: pos.token_mint,
          tokenSymbol: pos.token_symbol,
          tokenName: pos.token_name,
          stakedAmount: onChainAmount, // Use on-chain amount
          pendingRewards: pending,
          apy: calculatedAPR,
          lockPeriod: pos.lock_period,
          lockProgress: Number(pos.lock_progress),
          stakeDate: new Date(pos.stake_date),
          // Debug values
          debugAmount: onChainAmount, // Use on-chain amount for debug
          debugAccRewardPerShare: poolData.acc_reward_per_share,
          debugRewardPerSharePaid: positionRewardPerSharePaid,
          debugDelta: delta,
          debugRewardOwed: rewardOwedOnChain,
          debugTimeSinceUpdate: secondsSinceLastUpdate,
          debugTokenDecimals: tokenDecimals,
          debugPendingCalculation: calcPart,
          debugPoolLastUpdate: poolData.last_update,
          debugCurrentTimestamp: currentTimestamp,
          debugIsZeroDelta: isZeroDelta,
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