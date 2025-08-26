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

const Staking = () => {
  const walletCtx = useWallet();
  const { connected, publicKey, sendTransaction } = walletCtx;
  const navigate = useNavigate();
  const { holdings, isLoading: holdingsLoading } = useTokenHoldings();
  const { stakedPositions, totalStaked, totalRewards, isLoading: stakingLoading } = useStaking();
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(6);
  };

  const formatTokenAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  // Helper function to resolve token program ID
  const resolveTokenProgramId = async (mint: PublicKey): Promise<PublicKey> => {
    const mintAccInfo = await connection.getAccountInfo(mint);
    const isToken2022 = mintAccInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ?? false;
    return isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
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

      toast({ title: 'Staking Initiated', description: `Tx: ${sig}` });
      setStakeAmount('');
      setSelectedToken('');
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
      if (sim.value.err) {
        console.error('❌ Simulation failed:', sim.value.err, sim.value.logs);
        throw new Error('Transaction simulation failed. Check console for program logs.');
      }

      const sig = await sendTransaction(tx, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

      toast({ title: 'Unstaking Initiated', description: `Tx: ${sig}` });
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
      if (sim.value.err) {
        console.error('❌ Simulation failed:', sim.value.err, sim.value.logs);
        throw new Error('Transaction simulation failed. Check console for program logs.');
      }

      const sig = await sendTransaction(tx, connection, { minContextSlot });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

      toast({ title: 'Rewards Claimed', description: `Tx: ${sig}` });
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
              {stakingLoading ? '...' : `$${formatNumber(totalStaked)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stakedPositions.length} positions
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
              {stakingLoading ? '...' : `$${formatNumber(totalRewards)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to claim
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APY</CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              12.5%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all pools
            </p>
          </CardContent>
        </Card>
      </div>

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
                              15% APY
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
                    <Badge variant="outline">15% APY</Badge>
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
                          <Badge variant="secondary">{position.apy}% APY</Badge>
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