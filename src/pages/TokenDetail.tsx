import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  BarChart3,
  ArrowLeft,
  Copy,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { connection, useSolanaProgram } from '@/lib/solana-program';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';

const TokenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { connected, publicKey } = useWallet();
  const { sol: solBalance } = useWalletBalance();
  const { buyToken, sellToken, isConnected } = useSolanaProgram();
  const [buyAmount, setBuyAmount] = React.useState('');
  const [sellAmount, setSellAmount] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('buy');
  const [tokenBalance, setTokenBalance] = React.useState(0);
  const [priceHistory, setPriceHistory] = React.useState<Array<{ time: string; price: number }>>([]);
  const [dbToken, setDbToken] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tradingLoading, setTradingLoading] = React.useState(false);
  const [virtualPool, setVirtualPool] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchToken = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('base_mint', id)
        .maybeSingle();
      if (error) {
        console.error('Failed to load token', error);
      }
      setDbToken(data ?? null);
      setLoading(false);
      if (data?.name) {
        document.title = `${data.name} (${data.symbol}) | Coinporate`;
      }
    };
    fetchToken();
  }, [id]);

  React.useEffect(() => {
    const fetchVirtualPool = async () => {
      try {
        if (!dbToken?.pool_address) return;
        const client = new DynamicBondingCurveClient(connection, 'confirmed');
        const state = await client.state.getPool(new PublicKey(dbToken.pool_address));
        setVirtualPool((state as any)?.account ?? state ?? null);
      } catch (e) {
        console.error('Failed to load virtual pool', e);
        setVirtualPool(null);
      }
    };
    fetchVirtualPool();
  }, [dbToken?.pool_address]);

  // Fetch user's token balance
  const fetchTokenBalance = React.useCallback(async () => {
    if (!publicKey || !id) {
      setTokenBalance(0);
      return;
    }

    try {
      // Use the token mint address from the URL (id parameter)
      const tokenMint = new PublicKey(id);
      
      // Get mint info for correct decimals
      const mintInfo = await getMint(connection, tokenMint);
      const decimals = mintInfo.decimals;
      
      console.log(`Token mint: ${id}, decimals: ${decimals}`);
      
      // Get user's associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(tokenMint, publicKey);
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      
      // Calculate balance with correct decimals
      const balance = Number(tokenAccount.amount) / Math.pow(10, decimals);
      setTokenBalance(balance);
      console.log(`Token balance: ${balance} tokens`);
    } catch (error) {
      // Token account doesn't exist or error fetching
      console.log('Token account not found or error:', error);
      setTokenBalance(0);
    }
  }, [publicKey, id]);

  React.useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  // Fetch price history from database
  const fetchPriceHistory = React.useCallback(async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('token_mint', id)
        .order('timestamp', { ascending: true })
        .limit(100); // Get last 100 price points

      if (error) {
        console.error('Failed to fetch price history:', error);
        return;
      }

      console.log('Fetched price history:', data);

      if (data && data.length > 0) {
        const formattedHistory = data.map((entry, index) => ({
          time: new Date(entry.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          price: Number(entry.price_sol) || 0,
        }));
        setPriceHistory(formattedHistory);
      } else {
        // Create dummy data if no history exists
        setPriceHistory(Array.from({ length: 24 }).map((_, i) => ({ 
          time: `${i}:00`, 
          price: 0 
        })));
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      setPriceHistory(Array.from({ length: 24 }).map((_, i) => ({ 
        time: `${i}:00`, 
        price: 0 
      })));
    }
  }, [id]);

  React.useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  React.useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const tokenPriceSOL = React.useMemo(() => {
    const sqrt = (virtualPool as any)?.sqrtPrice;
    try {
      if (!sqrt) return 0;
      const n = Number(sqrt.toString?.() ?? sqrt);
      if (!isFinite(n) || n <= 0) return 0;
      return n / 2 ** 63;
    } catch {
      return 0;
    }
  }, [virtualPool]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading token...</h1>
        </div>
      </div>
    );
  }

  if (!dbToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const token = {
    id: dbToken.base_mint as string,
    name: dbToken.name as string,
    symbol: dbToken.symbol as string,
    description: (dbToken.description as string) ?? '',
    image: (dbToken.image_url as string) ?? '/placeholder.svg',
    price: 0,
    change24h: 0,
    marketCap: 0,
    holders: 0,
    createdAt: new Date(dbToken.created_at).toLocaleDateString(),
    creator: (dbToken.creator as string) ?? '',
    totalSupply: Number(dbToken.initial_supply ?? 0),
    circulatingSupply: Number(dbToken.initial_supply ?? 0),
    volume24h: 0,
    liquidity: 0,
    priceHistory: priceHistory,
    baseMint: dbToken.base_mint as string,
    poolType: dbToken.pool_type as number | null,
    activationPoint: dbToken.activation_point as number | null,
    poolAddress: dbToken.pool_address as string | null,
  } as const;

  const bondingCurveStatus =
    token.poolAddress ? (token.activationPoint ? 'Active' : 'Pending Activation') : 'Not Created';

  const isPositive = token.change24h >= 0;

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(2);
    return price.toFixed(6);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

const copyAddress = () => {
  navigator.clipboard.writeText(token.baseMint);
  toast({
    title: "Address Copied!",
    description: "Token mint address copied to clipboard",
  });
};

  const handleTrade = async (type: 'buy' | 'sell') => {
    const amount = type === 'buy' ? buyAmount : sellAmount;
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Enter Amount",
        description: "Please enter a valid amount to trade",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive"
      });
      return;
    }

    if (!token.poolAddress) {
      toast({
        title: "Pool Not Available",
        description: "Trading pool is not available for this token",
        variant: "destructive"
      });
      return;
    }

    setTradingLoading(true);
    try {
      const amountNum = parseFloat(amount);
      let signature: string;

      if (type === 'buy') {
        signature = await buyToken(token.poolAddress, amountNum);
        toast({
          title: "Buy Order Success! 🚀",
          description: `Successfully bought ${token.symbol} with ${amount} SOL`,
        });
        setBuyAmount('');
        // Refresh token balance and price history after successful buy
        setTimeout(() => {
          fetchTokenBalance();
          fetchPriceHistory();
        }, 3000);
      } else {
        // For sell, we need to convert SOL amount to token amount
        const tokenAmountToSell = tokenPriceSOL > 0 ? Math.floor(amountNum / tokenPriceSOL) : 0;
        signature = await sellToken(token.poolAddress, tokenAmountToSell);
        toast({
          title: "Sell Order Success! 💰",
          description: `Successfully sold ${token.symbol} for ${amount} SOL`,
        });
        setSellAmount('');
        // Refresh token balance and price history after successful sell
        setTimeout(() => {
          fetchTokenBalance();
          fetchPriceHistory();
        }, 3000);
      }

      console.log('Transaction signature:', signature);
    } catch (error) {
      console.error('Trade error:', error);
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
        variant: "destructive"
      });
    } finally {
      setTradingLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discover
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Token Info & Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Token Header */}
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <img 
                    src={token.image} 
                    alt={token.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold">{token.name}</h1>
                      <Badge variant="secondary">${token.symbol}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{token.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Mint:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {token.baseMint.slice(0, 4)}...{token.baseMint.slice(-4)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyAddress} aria-label="Copy mint address">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        aria-label="View on Solana Explorer"
                      >
                        <a
                          href={`https://explorer.solana.com/address/${token.baseMint}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Bonding Curve Process:</span>
                      <span className="text-sm font-medium">
                        {virtualPool
                          ? (Number(virtualPool.quoteReserve.toString()) / 10 ** 9).toPrecision(2)
                          : 0}{" "}
                        SOL / 10 SOL
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {tokenPriceSOL ? tokenPriceSOL.toPrecision(5) : '-'} SOL
                    </div>
                    <div className="text-xs text-muted-foreground">Price (SOL)</div>
                  </div>
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                      isPositive ? 'text-pump-success' : 'text-pump-danger'
                    }`}>
                      {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {Math.abs(token.change24h).toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">24h Change</div>
                  </div>
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">${formatNumber(token.marketCap)}</div>
                    <div className="text-xs text-muted-foreground">Market Cap</div>
                  </div>
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{formatNumber(token.holders)}</div>
                    <div className="text-xs text-muted-foreground">Holders</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Price Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={token.priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `${value.toFixed(8)} SOL`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value: any) => [`${Number(value).toFixed(8)} SOL`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Token Stats */}
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Token Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total Supply</div>
                    <div className="text-lg font-semibold">{formatNumber(token.totalSupply)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Circulating Supply</div>
                    <div className="text-lg font-semibold">{formatNumber(token.circulatingSupply)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">24h Volume</div>
                    <div className="text-lg font-semibold">${formatNumber(token.volume24h)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Liquidity</div>
                    <div className="text-lg font-semibold">${formatNumber(token.liquidity)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Creator</div>
                    <div className="text-lg font-semibold font-mono text-sm" title={token.creator}>
                      {token.creator ? `${token.creator.slice(0,4)}...${token.creator.slice(-4)}` : '-'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="text-lg font-semibold">{token.createdAt}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading */}
          <div className="space-y-6">
            {/* Trading Panel */}
            <Card className="bg-gradient-card border-border sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Trade {token.symbol}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="buy" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy">Buy</TabsTrigger>
                    <TabsTrigger value="sell">Sell</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="buy" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount (SOL)</label>
                      <Input
                        type="number"
                        placeholder="0.1"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        className="bg-input/50"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ≈ {buyAmount && tokenPriceSOL > 0 ? (parseFloat(buyAmount) / tokenPriceSOL).toFixed(0) : '0'} {token.symbol}
                    </div>
                    <Button 
                      variant="success" 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleTrade('buy')}
                      disabled={tradingLoading || !isConnected}
                    >
                      {tradingLoading ? 'Processing...' : `Buy ${token.symbol}`}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="sell" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount (SOL)</label>
                      <Input
                        type="number"
                        placeholder="0.1"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        className="bg-input/50"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ≈ {sellAmount && tokenPriceSOL > 0 ? (parseFloat(sellAmount) / tokenPriceSOL).toFixed(0) : '0'} {token.symbol}
                    </div>
                    <Button 
                      variant="danger" 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleTrade('sell')}
                      disabled={tradingLoading || !isConnected}
                    >
                      {tradingLoading ? 'Processing...' : `Sell ${token.symbol}`}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Token Balance Display */}
            {isConnected && (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Your Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {formatNumber(tokenBalance)}
                    </div>
                    <div className="text-xs text-muted-foreground">{token.symbol}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ≈ {(tokenBalance * tokenPriceSOL).toFixed(6)} SOL
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">
                  {activeTab === 'buy' ? 'Quick Buy' : 'Quick Sell'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeTab === 'buy' ? (
                  // Quick buy with SOL balance percentages
                  [10, 30, 50, 70, 100].map((percentage) => {
                    const amount = (solBalance * percentage) / 100;
                    return (
                      <Button
                        key={percentage}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setBuyAmount(amount.toFixed(3))}
                        disabled={!isConnected || solBalance === 0}
                      >
                        <span>{percentage}% ({amount.toFixed(3)} SOL)</span>
                        <span className="text-muted-foreground">
                          ≈{tokenPriceSOL > 0 ? formatNumber(amount / tokenPriceSOL) : '0'} {token.symbol}
                        </span>
                      </Button>
                    );
                  })
                ) : (
                  // Quick sell with token balance percentages
                  [10, 30, 50, 70, 100].map((percentage) => {
                    const tokenAmount = (tokenBalance * percentage) / 100;
                    const solValue = tokenAmount * tokenPriceSOL;
                    return (
                      <Button
                        key={percentage}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setSellAmount(solValue.toFixed(6))}
                        disabled={!isConnected || tokenBalance === 0}
                      >
                        <span>{percentage}% ({formatNumber(tokenAmount)} {token.symbol})</span>
                        <span className="text-muted-foreground">
                          ≈{solValue.toFixed(6)} SOL
                        </span>
                      </Button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Community */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Community
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Holders</span>
                  </div>
                  <span className="font-semibold">{formatNumber(token.holders)}</span>
                </div>
                
                <Button variant="outline" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Join Community Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetail;