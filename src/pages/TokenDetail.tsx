import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { mockTokens } from '@/data/mockTokens';
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

const TokenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [buyAmount, setBuyAmount] = React.useState('');
  const [sellAmount, setSellAmount] = React.useState('');

  const token = mockTokens.find(t => t.id === id);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

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
    navigator.clipboard.writeText('0x1234567890abcdef...');
    toast({
      title: "Address Copied!",
      description: "Token contract address copied to clipboard",
    });
  };

  const handleTrade = (type: 'buy' | 'sell') => {
    const amount = type === 'buy' ? buyAmount : sellAmount;
    if (!amount) {
      toast({
        title: "Enter Amount",
        description: "Please enter an amount to trade",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: `${type === 'buy' ? 'Buy' : 'Sell'} Order Placed! 🚀`,
      description: `${type === 'buy' ? 'Buying' : 'Selling'} ${amount} SOL worth of ${token.symbol}`,
    });

    if (type === 'buy') setBuyAmount('');
    else setSellAmount('');
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
                      <span>Contract:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs">0x1234...abcd</code>
                      <Button variant="ghost" size="sm" onClick={copyAddress}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 bg-card/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">${formatPrice(token.price)}</div>
                    <div className="text-xs text-muted-foreground">Price</div>
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
                        tickFormatter={(value) => `$${value.toFixed(6)}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value: any) => [`$${value.toFixed(6)}`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={false}
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
                    <div className="text-lg font-semibold font-mono text-sm">{token.creator}</div>
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
                <Tabs defaultValue="buy" className="w-full">
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
                      ≈ {buyAmount ? (parseFloat(buyAmount) / token.price).toFixed(0) : '0'} {token.symbol}
                    </div>
                    <Button 
                      variant="success" 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleTrade('buy')}
                    >
                      Buy {token.symbol}
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
                      ≈ {sellAmount ? (parseFloat(sellAmount) / token.price).toFixed(0) : '0'} {token.symbol}
                    </div>
                    <Button 
                      variant="danger" 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleTrade('sell')}
                    >
                      Sell {token.symbol}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">Quick Buy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[0.1, 0.5, 1, 5].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setBuyAmount(amount.toString())}
                  >
                    <span>{amount} SOL</span>
                    <span className="text-muted-foreground">
                      ≈{formatNumber(amount / token.price)} {token.symbol}
                    </span>
                  </Button>
                ))}
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