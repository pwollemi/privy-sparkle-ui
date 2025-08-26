import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Coins, Lock, TrendingUp, Zap, Timer, Trophy } from 'lucide-react';
import { useTokenHoldings } from '@/hooks/useTokenHoldings';
import { useStaking } from '@/hooks/useStaking';
import { toast } from '@/hooks/use-toast';
import { StakingProgram } from '@/lib/staking';
import { connection } from '@/lib/solana-program';
import { PublicKey } from '@solana/web3.js';
import { getMint, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { supabase } from '@/integrations/supabase/client';

const Staking = () => {
  const walletCtx = useWallet();
  const { connected, publicKey, sendTransaction } = walletCtx;
  const navigate = useNavigate();
  const { holdings, isLoading: holdingsLoading } = useTokenHoldings();
  const { stakedPositions, totalStaked, totalRewards, isLoading: stakingLoading, refetch } = useStaking();
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [poolData, setPoolData] = useState<{reward_rate: number, total_staked: number} | null>(null);

  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);

  // Mock pool data - in real implementation, this would come from the Solana program
  useEffect(() => {
    // Simulating pool data fetch with realistic values for ~15% APR
    setPoolData({
      reward_rate: 47619, // Reward rate in tokens per second (calculated for 15% APR)
      total_staked: 1000000, // Total staked in tokens (1M tokens)
    });
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(6);
  };

  const formatCurrency = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    // For currency, show no decimals if it's a whole number, otherwise up to 2 decimals
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const formatTokenAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const calculateAPR = (reward_rate: number, total_staked: number) => {
    if (!total_staked || total_staked === 0) return 0;
    // APR = reward_rate * 365 * 86400 * 100 / total_staked / 1e9
    const apr = (reward_rate * 365 * 86400 * 100) / total_staked / 1e9;
    return apr;
  };

  const formatAPR = (apr: number) => {
    if (apr >= 1e6) return (apr / 1e6).toFixed(2) + 'M';
    if (apr >= 1e3) return (apr / 1e3).toFixed(2) + 'K';
    return apr % 1 === 0 ? apr.toString() : apr.toFixed(2);
  };

  // Helper function to resolve token program ID
  const resolveTokenProgramId = async (mint: PublicKey): Promise<PublicKey> => {
    const mintAccInfo = await connection.getAccountInfo(mint);
    const isToken2022 = mintAccInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ?? false;
    return isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  };

  const saveStakingPosition = async (tokenMint: string, amount: number) => {
    if (!publicKey) return;
    
    const selectedHolding = holdings.find(h => h.token_mint === tokenMint);
    if (!selectedHolding?.token) return;

    try {
      const { error } = await supabase
        .from('staking_positions')
        .upsert({
          user_wallet: publicKey.toString(),
          token_mint: tokenMint,
          token_symbol: selectedHolding.token.symbol,
          token_name: selectedHolding.token.name,
          staked_amount: amount,
          pending_rewards: 0,
          apy: poolData ? calculateAPR(poolData.reward_rate, poolData.total_staked) : 15,
          lock_period: 30,
          lock_progress: 0,
        }, {
          onConflict: 'user_wallet,token_mint'
        });

      if (error) {
        console.error('Failed to save staking position:', error);
      }
    } catch (error) {
      console.error('Failed to save staking position:', error);
    }
  };

  const handleStake = async () => {
    if (!selectedToken || !stakeAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a token and enter an amount to stake.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!publicKey) throw new Error('Wallet not connected');
      const staking = new StakingProgram(connection, walletCtx);
      const mintPk = new PublicKey(selectedToken);
      const tokenProgram = await resolveTokenProgramId(mintPk);
      const mintInfo = await getMint(connection, mintPk, undefined, tokenProgram);
      const decimals = Number(mintInfo.decimals ?? 0);
      const raw = Number(stakeAmount);
      if (!raw || raw <= 0) throw new Error('Enter a valid amount');
      const amountBase = Math.floor(raw * Math.pow(10, decimals));

      // Get user's token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPk,
        publicKey,
        false,
        tokenProgram
      );

      console.log('🚀 Creating staking transaction...');
      console.log(`📊 Staking ${raw} tokens (${amountBase} base units) of ${selectedToken}`);

      const tx = await staking.stakeTokens(publicKey, mintPk, tokenAccount, amountBase);
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;

      const sim = await connection.simulateTransaction(tx);
      console.log('🔍 Full simulation result:', sim);
      console.log('🔍 Simulation error details:', sim.value.err);
      console.log('🔍 Program logs:', sim.value.logs);
      if (sim.value.err) {
        console.error('❌ Simulation failed:');
        console.error('Error:', JSON.stringify(sim.value.err, null, 2));
        console.error('Logs:', sim.value.logs?.join('\n'));
        throw new Error(`Transaction simulation failed: ${JSON.stringify(sim.value.err)}`);
      }

      const sig = await sendTransaction(tx, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

      // Save position to database after successful staking
      await saveStakingPosition(selectedToken, raw);
      
      toast({ title: 'Staking Initiated', description: `Tx: ${sig}` });
      setStakeAmount('');
      setSelectedToken('');
      refetch(); // Refresh positions
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Staking Failed', description: error?.message || 'Failed to stake tokens', variant: 'destructive' });
    }
  };

  const handleUnstake = async (tokenMint: string, amount: string) => {
    try {
      if (!publicKey) throw new Error('Wallet not connected');
      const staking = new StakingProgram(connection, walletCtx);
      const mintPk = new PublicKey(tokenMint);
      const tokenProgram = await resolveTokenProgramId(mintPk);
      const mintInfo = await getMint(connection, mintPk, undefined, tokenProgram);
      const decimals = Number(mintInfo.decimals ?? 0);
      const raw = Number(amount);
      if (!raw || raw <= 0) throw new Error('Enter a valid amount');
      const amountBase = Math.floor(raw * Math.pow(10, decimals));

      // Get user's token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPk,
        publicKey,
        false,
        tokenProgram
      );

      const tx = await staking.unstakeTokens(publicKey, mintPk, tokenAccount, amountBase);
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;

      const sim = await connection.simulateTransaction(tx);
      console.log('🔍 Unstake simulation result:', sim);
      console.log('🔍 Unstake program logs:', sim.value.logs);
      if (sim.value.err) {
        console.error('❌ Unstake simulation failed:', sim.value.err, sim.value.logs);
        throw new Error(`Unstake transaction simulation failed: ${JSON.stringify(sim.value.err)}`);
      }

      const sig = await sendTransaction(tx, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

      // Update position in database after successful unstaking
      const currentPosition = stakedPositions.find(p => p.tokenMint === tokenMint);
      if (currentPosition) {
        const newStakedAmount = currentPosition.stakedAmount - raw;
        if (newStakedAmount <= 0) {
          // Delete position if fully unstaked
          await supabase
            .from('staking_positions')
            .delete()
            .eq('user_wallet', publicKey.toString())
            .eq('token_mint', tokenMint);
        } else {
          // Update remaining staked amount
          await supabase
            .from('staking_positions')
            .update({ staked_amount: newStakedAmount })
            .eq('user_wallet', publicKey.toString())
            .eq('token_mint', tokenMint);
        }
      }

      toast({ title: 'Unstaking Initiated', description: `Tx: ${sig}` });
      setUnstakeAmount('');
      refetch(); // Refresh positions
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Unstaking Failed', description: error?.message || 'Failed to unstake tokens', variant: 'destructive' });
    }
  };

  const handleClaimRewards = async (tokenMint: string) => {
    try {
      if (!publicKey) throw new Error('Wallet not connected');
      const staking = new StakingProgram(connection, walletCtx);
      const mintPk = new PublicKey(tokenMint);

      // Get user's token account
      const tokenProgram = await resolveTokenProgramId(mintPk);
      const tokenAccount = await getAssociatedTokenAddress(
        mintPk,
        publicKey,
        false,
        tokenProgram
      );

      const tx = await staking.claimRewards(publicKey, mintPk, tokenAccount);
      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;

      const sim = await connection.simulateTransaction(tx);
      console.log('🔍 Claim rewards simulation result:', sim);
      console.log('🔍 Claim rewards program logs:', sim.value.logs);
      if (sim.value.err) {
        console.error('❌ Claim rewards simulation failed:', sim.value.err, sim.value.logs);
        throw new Error(`Claim rewards transaction simulation failed: ${JSON.stringify(sim.value.err)}`);
      }

      const sig = await sendTransaction(tx, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

      // Reset pending rewards in database after successful claim
      await supabase
        .from('staking_positions')
        .update({ pending_rewards: 0 })
        .eq('user_wallet', publicKey.toString())
        .eq('token_mint', tokenMint);

      toast({ title: 'Rewards Claimed', description: `Tx: ${sig}` });
      refetch(); // Refresh positions
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Claim Failed', description: error?.message || 'Failed to claim rewards', variant: 'destructive' });
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">Connect your wallet to start staking your tokens</p>
          <Button onClick={() => navigate('/')} variant="neon">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">Staking Platform</h1>
        <p className="text-muted-foreground">Stake your tokens and earn rewards</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stakingLoading ? '...' : `${formatTokenAmount(totalStaked)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens staked across {stakedPositions.length} positions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <TrendingUp className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">
              {stakingLoading ? '...' : `${formatTokenAmount(totalRewards)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens available to claim
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APR</CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {poolData ? `${formatAPR(calculateAPR(poolData.reward_rate, poolData.total_staked))}%` : '15%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current pool rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staked Amounts Breakdown */}
      {stakedPositions.length > 0 && (
        <Card className="bg-gradient-card border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Staked Amounts by Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stakedPositions.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{position.tokenSymbol.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{position.tokenSymbol}</p>
                      <p className="text-sm text-muted-foreground">{position.tokenName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatTokenAmount(position.stakedAmount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTokenAmount(position.pendingRewards)} pending
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stake" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stake">Stake Tokens</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Stake Your Tokens
              </CardTitle>
              <CardDescription>
                Choose from your holdings and start earning rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {holdingsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading your holdings...</p>
                </div>
              ) : holdings.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tokens found in your wallet</p>
                  <Button 
                    onClick={() => navigate('/')} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Discover Tokens
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {holdings.map((holding) => (
                    <Card 
                      key={holding.token_mint} 
                      className={`cursor-pointer transition-all ${
                        selectedToken === holding.token_mint 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedToken(holding.token_mint)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {holding.token?.image_url && (
                              <img 
                                src={holding.token.image_url} 
                                alt={holding.token.name}
                                className="w-10 h-10 rounded-full"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold">{holding.token?.symbol || 'Unknown'}</h3>
                              <p className="text-sm text-muted-foreground">
                                {holding.token?.name || 'Unknown Token'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatTokenAmount(holding.balance)}</p>
                            <Badge variant="secondary" className="text-xs">
                              {poolData ? `${formatAPR(calculateAPR(poolData.reward_rate, poolData.total_staked))}% APR` : '15% APR'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedToken && (
                <div className="space-y-4 p-6 bg-card/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="stake-amount">Amount to Stake</Label>
                    <Badge variant="outline">{poolData ? `${formatAPR(calculateAPR(poolData.reward_rate, poolData.total_staked))}% APR` : '15% APR'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="stake-amount"
                      type="number"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const holding = holdings.find(h => h.token_mint === selectedToken);
                        if (holding) {
                          setStakeAmount(holding.balance.toString());
                        }
                      }}
                    >
                      Max
                    </Button>
                  </div>
                  <Button onClick={handleStake} className="w-full" variant="neon">
                    <Lock className="h-4 w-4 mr-2" />
                    Stake Tokens
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                Your Staking Positions
              </CardTitle>
              <CardDescription>
                Manage your staked tokens and claim rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stakingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading your positions...</p>
                </div>
              ) : stakedPositions.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No staking positions found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start by staking some tokens to earn rewards
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stakedPositions.map((position, index) => (
                    <Card key={index} className="border-border/50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                              <Coins className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{position.tokenSymbol}</h3>
                              <p className="text-sm text-muted-foreground">{position.tokenName}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{formatAPR(position.apy)}% APR</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Staked Amount</p>
                            <p className="font-medium">{formatTokenAmount(position.stakedAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pending Rewards</p>
                            <p className="font-medium text-neon-green">{formatTokenAmount(position.pendingRewards)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Lock Period</p>
                            <p className="font-medium flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {position.lockPeriod} days
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Progress</p>
                            <div className="mt-1">
                              <Progress value={position.lockProgress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {position.lockProgress}% complete
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Debug Values Section */}
                        <div className="bg-muted/50 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Debug Values - Position {position.tokenSymbol}</h4>
                          
                          {/* Position Debug Values */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                            <div>
                              <p className="text-muted-foreground mb-1">Staked Amount</p>
                              <p className="font-mono">{position.debugAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Delta (acc - paid)</p>
                              <p className="font-mono">{position.debugDelta.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Acc Reward Per Share</p>
                              <p className="font-mono">{position.debugAccRewardPerShare.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Reward Per Share Paid</p>
                              <p className="font-mono">{position.debugRewardPerSharePaid.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Pending Rewards Calculation */}
                          <div className="border-t border-border/50 pt-3 mb-4">
                            <h5 className="text-xs text-muted-foreground mb-2 font-semibold">Pending Rewards Formula: reward_owed + (amount × delta × time_since_update) ÷ decimals</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-muted-foreground mb-1">Reward Owed</p>
                                <p className="font-mono">{position.debugRewardOwed.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Time Since Update (s)</p>
                                <p className="font-mono">{position.debugTimeSinceUpdate.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Token Decimals</p>
                                <p className="font-mono">{position.debugTokenDecimals.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Calculated Part</p>
                                <p className="font-mono">{position.debugPendingCalculation.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="mt-2 p-2 bg-accent/20 rounded">
                              <p className="text-xs text-muted-foreground">Total Pending: {position.debugRewardOwed.toLocaleString()} + {position.debugPendingCalculation.toLocaleString()} = <span className="font-semibold text-neon-green">{position.pendingRewards.toLocaleString()}</span></p>
                            </div>
                          </div>

                          {/* User Totals */}
                          <div className="border-t border-border/50 pt-3">
                            <h5 className="text-xs text-muted-foreground mb-2 font-semibold">User Totals (Sum of all positions)</h5>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-muted-foreground mb-1">Total Staked Amount</p>
                                <p className="font-mono font-semibold text-primary">{totalStaked.toLocaleString()} tokens</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Total Pending Rewards</p>
                                <p className="font-mono font-semibold text-neon-green">{totalRewards.toLocaleString()} tokens</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Unstake
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Unstake Tokens</DialogTitle>
                                <DialogDescription>
                                  Enter the amount you want to unstake
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="unstake-amount">Amount to Unstake</Label>
                                  <Input
                                    id="unstake-amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={unstakeAmount}
                                    onChange={(e) => setUnstakeAmount(e.target.value)}
                                    max={position.stakedAmount}
                                  />
                                </div>
                                <Button 
                                  onClick={() => handleUnstake(position.tokenMint, unstakeAmount)}
                                  className="w-full"
                                  variant="destructive"
                                >
                                  Unstake Tokens
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            onClick={() => handleClaimRewards(position.tokenMint)}
                            size="sm" 
                            variant="neon"
                            disabled={position.pendingRewards === 0}
                          >
                            Claim Rewards
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Staking;