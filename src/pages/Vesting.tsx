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
import { Lock, Clock, TrendingUp, Calendar, Timer, Trophy, Coins } from 'lucide-react';
import { useTokenHoldings } from '@/hooks/useTokenHoldings';
import { toast } from '@/hooks/use-toast';

const Vesting = () => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const { holdings, isLoading: holdingsLoading } = useTokenHoldings();
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [vestAmount, setVestAmount] = useState('');
  const [vestingPositions, setVestingPositions] = useState<any[]>([]);

  // Vesting parameters from user requirements
  const vestingConfig = {
    totalSupply: 20_000_000, // 20% of total supply
    duration: 365, // 1 year in days
    cliffDuration: 30, // 1 month cliff in days
    vestingPeriods: 12, // Number of vesting periods
  };

  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);

  // Mock vesting positions - in real implementation, this would come from Supabase
  useEffect(() => {
    if (connected && publicKey) {
      // Mock data for demonstration
      setVestingPositions([
        {
          id: '1',
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
          totalAmount: 5000,
          vestedAmount: 1250,
          claimedAmount: 833,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          cliffEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000), // 305 days from now
        },
      ]);
    }
  }, [connected, publicKey]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(6);
  };

  const formatTokenAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const calculateVestedAmount = (position: any) => {
    const now = new Date();
    const { startDate, cliffEnd, endDate, totalAmount } = position;
    
    if (now < cliffEnd) return 0; // Still in cliff period
    if (now >= endDate) return totalAmount; // Fully vested
    
    const vestingStarted = cliffEnd.getTime();
    const vestingEnd = endDate.getTime();
    const vestingDuration = vestingEnd - vestingStarted;
    const timeVested = now.getTime() - vestingStarted;
    
    const vestingProgress = Math.min(timeVested / vestingDuration, 1);
    return Math.floor(totalAmount * vestingProgress);
  };

  const calculateClaimableAmount = (position: any) => {
    const vestedAmount = calculateVestedAmount(position);
    return Math.max(0, vestedAmount - position.claimedAmount);
  };

  const getVestingProgress = (position: any) => {
    const now = new Date();
    const { startDate, endDate } = position;
    
    if (now < startDate) return 0;
    if (now >= endDate) return 100;
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    
    return Math.min((elapsed / totalDuration) * 100, 100);
  };

  const getTimeRemaining = (position: any) => {
    const now = new Date();
    const { endDate, cliffEnd } = position;
    
    if (now < cliffEnd) {
      const timeToCliff = cliffEnd.getTime() - now.getTime();
      const days = Math.ceil(timeToCliff / (1000 * 60 * 60 * 24));
      return `${days} days until cliff ends`;
    }
    
    if (now >= endDate) return 'Fully vested';
    
    const timeRemaining = endDate.getTime() - now.getTime();
    const days = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  const handleCreateVesting = async () => {
    if (!selectedToken || !vestAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a token and enter an amount to vest.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(vestAmount);
    const selectedHolding = holdings.find(h => h.token_mint === selectedToken);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedHolding) {
      toast({
        title: "Token Not Found",
        description: "Selected token not found in your holdings.",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > selectedHolding.balance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${formatTokenAmount(selectedHolding.balance)} ${selectedHolding.token?.symbol} available.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // In real implementation, this would create a vesting schedule on-chain
      const startDate = new Date();
      const cliffEnd = new Date(startDate.getTime() + vestingConfig.cliffDuration * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + vestingConfig.duration * 24 * 60 * 60 * 1000);
      
      const selectedHolding = holdings.find(h => h.token_mint === selectedToken);
      
      const newPosition = {
        id: Date.now().toString(),
        tokenMint: selectedToken,
        tokenSymbol: selectedHolding?.token?.symbol || 'UNK',
        tokenName: selectedHolding?.token?.name || 'Unknown Token',
        totalAmount: amount,
        vestedAmount: 0,
        claimedAmount: 0,
        startDate,
        cliffEnd,
        endDate,
      };

      setVestingPositions(prev => [...prev, newPosition]);
      
      toast({ 
        title: 'Vesting Schedule Created', 
        description: `Successfully created vesting schedule for ${formatTokenAmount(amount)} ${selectedHolding?.token?.symbol}` 
      });
      
      setVestAmount('');
      setSelectedToken('');
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: 'Vesting Failed', 
        description: error?.message || 'Failed to create vesting schedule', 
        variant: 'destructive' 
      });
    }
  };

  const handleClaimVested = async (positionId: string) => {
    try {
      const position = vestingPositions.find(p => p.id === positionId);
      if (!position) return;
      
      const claimableAmount = calculateClaimableAmount(position);
      if (claimableAmount <= 0) {
        toast({
          title: "Nothing to Claim",
          description: "No vested tokens available to claim yet.",
          variant: "destructive",
        });
        return;
      }

      // In real implementation, this would claim tokens from the vesting contract
      setVestingPositions(prev => 
        prev.map(p => 
          p.id === positionId 
            ? { ...p, claimedAmount: p.claimedAmount + claimableAmount }
            : p
        )
      );
      
      toast({ 
        title: 'Tokens Claimed', 
        description: `Successfully claimed ${formatTokenAmount(claimableAmount)} ${position.tokenSymbol}` 
      });
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: 'Claim Failed', 
        description: error?.message || 'Failed to claim vested tokens', 
        variant: 'destructive' 
      });
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">Connect your wallet to create vesting schedules</p>
          <Button onClick={() => navigate('/')} variant="neon">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const totalVesting = vestingPositions.reduce((sum, pos) => sum + pos.totalAmount, 0);
  const totalVested = vestingPositions.reduce((sum, pos) => sum + calculateVestedAmount(pos), 0);
  const totalClaimable = vestingPositions.reduce((sum, pos) => sum + calculateClaimableAmount(pos), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">Token Vesting</h1>
        <p className="text-muted-foreground">Lock tokens with scheduled vesting over time</p>
      </div>

      {/* Vesting Configuration */}
      <Card className="bg-gradient-card border-border/50 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Vesting Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Supply</p>
              <p className="text-lg font-bold text-primary">{formatNumber(vestingConfig.totalSupply)}</p>
              <p className="text-xs text-muted-foreground">20% of supply</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Cliff Period</p>
              <p className="text-lg font-bold text-accent">{vestingConfig.cliffDuration} Days</p>
              <p className="text-xs text-muted-foreground">1 Month</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Vesting Duration</p>
              <p className="text-lg font-bold text-neon-green">{vestingConfig.duration} Days</p>
              <p className="text-xs text-muted-foreground">1 Year</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Vesting Periods</p>
              <p className="text-lg font-bold text-secondary">{vestingConfig.vestingPeriods}</p>
              <p className="text-xs text-muted-foreground">Monthly</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vesting</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatTokenAmount(totalVesting)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens locked in vesting
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vested Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">
              {formatTokenAmount(totalVested)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tokens already vested
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claimable</CardTitle>
            <Trophy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatTokenAmount(totalClaimable)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to claim
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Vesting</TabsTrigger>
          <TabsTrigger value="schedules">My Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Create Vesting Schedule
              </CardTitle>
              <CardDescription>
                Lock tokens with a vesting schedule based on the configuration above
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {holdingsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading your tokens...</p>
                </div>
              ) : holdings.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tokens found in your wallet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-select">Select Token</Label>
                    <select
                      id="token-select"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Choose a token to vest</option>
                      {holdings.map((holding) => (
                        <option key={holding.token_mint} value={holding.token_mint}>
                          {holding.token?.symbol} - {formatTokenAmount(holding.balance)} available
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vest-amount">Amount to Vest</Label>
                    <Input
                      id="vest-amount"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter amount"
                      value={vestAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || (parseFloat(value) >= 0)) {
                          setVestAmount(value);
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  <Button 
                    onClick={handleCreateVesting}
                    className="w-full" 
                    variant="neon"
                    disabled={!selectedToken || !vestAmount}
                  >
                    Create Vesting Schedule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          {vestingPositions.length === 0 ? (
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Vesting Schedules</h3>
                <p className="text-muted-foreground text-center">
                  Create your first vesting schedule to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {vestingPositions.map((position) => {
                const vestedAmount = calculateVestedAmount(position);
                const claimableAmount = calculateClaimableAmount(position);
                const vestingProgress = getVestingProgress(position);
                const timeRemaining = getTimeRemaining(position);
                
                return (
                  <Card key={position.id} className="bg-gradient-card border-border/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {position.tokenSymbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{position.tokenSymbol}</h3>
                            <p className="text-sm text-muted-foreground">{position.tokenName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Timer className="h-3 w-3 mr-1" />
                          {timeRemaining}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Locked</p>
                          <p className="font-semibold">{formatTokenAmount(position.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Vested</p>
                          <p className="font-semibold text-neon-green">{formatTokenAmount(vestedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Claimed</p>
                          <p className="font-semibold text-accent">{formatTokenAmount(position.claimedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Claimable</p>
                          <p className="font-semibold text-primary">{formatTokenAmount(claimableAmount)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Vesting Progress</span>
                          <span>{vestingProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={vestingProgress} className="h-2" />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleClaimVested(position.id)}
                          disabled={claimableAmount <= 0}
                          className="flex-1"
                          variant={claimableAmount > 0 ? "neon" : "outline"}
                        >
                          Claim {claimableAmount > 0 ? formatTokenAmount(claimableAmount) : '0'} Tokens
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Vesting;