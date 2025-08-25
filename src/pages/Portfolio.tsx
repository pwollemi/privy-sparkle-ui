import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTokenHoldings } from '@/hooks/useTokenHoldings';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Loader2
} from 'lucide-react';

const Portfolio = () => {
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  
  const { holdings, isLoading: holdingsLoading, error: holdingsError, refetch } = useTokenHoldings();
  const tokenMints = holdings.map(h => h.token_mint);
  const { prices, isLoading: pricesLoading } = useTokenPrices(tokenMints);

  const isLoading = holdingsLoading || pricesLoading;

  // Calculate portfolio metrics
  const portfolioData = holdings.map(holding => {
    const currentPrice = prices[holding.token_mint] || 0;
    const currentValue = holding.balance * currentPrice;
    
    return {
      ...holding,
      currentPrice,
      currentValue,
      // For now, we don't have invested amount data, so we'll use current value
      investedAmount: currentValue // This should be tracked separately in a future update
    };
  });

  const totalValue = portfolioData.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalInvested = portfolioData.reduce((sum, holding) => sum + holding.investedAmount, 0);
  const totalPnL = totalValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  const formatPrice = (price: number) => {
    if (price === 0) return '0.00';
    if (price < 0.000001) return '< 0.000001';
    if (price < 0.01) return price.toFixed(6);
    return price.toFixed(4);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Portfolio</h1>
          <p className="text-muted-foreground">Track your Coinporate token investments</p>
          
          {!connected && (
            <div className="mt-4 p-4 bg-card/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-3">Connect your wallet to view your token holdings</p>
              <WalletMultiButton />
            </div>
          )}
        </div>

        {/* Portfolio Overview */}
        {connected && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{formatPrice(totalValue)} SOL</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-secondary" />
                </div>
                <span className="text-sm text-muted-foreground">Invested</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{formatPrice(totalInvested)} SOL</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${totalPnL >= 0 ? 'bg-pump-success/10' : 'bg-pump-danger/10'}`}>
                  {totalPnL >= 0 ? 
                    <ArrowUpRight className="h-5 w-5 text-pump-success" /> : 
                    <ArrowDownRight className="h-5 w-5 text-pump-danger" />
                  }
                </div>
                <span className="text-sm text-muted-foreground">P&L</span>
              </div>
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-pump-success' : 'text-pump-danger'}`}>
                {formatPrice(Math.abs(totalPnL))} SOL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${totalPnLPercent >= 0 ? 'bg-pump-success/10' : 'bg-pump-danger/10'}`}>
                  {totalPnLPercent >= 0 ? 
                    <TrendingUp className="h-5 w-5 text-pump-success" /> : 
                    <TrendingDown className="h-5 w-5 text-pump-danger" />
                  }
                </div>
                <span className="text-sm text-muted-foreground">P&L %</span>
              </div>
              <div className={`text-2xl font-bold ${totalPnLPercent >= 0 ? 'text-pump-success' : 'text-pump-danger'}`}>
                {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Holdings */}
        {connected && (
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Your Holdings
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holdingsError ? (
              <div className="text-center py-12">
                <div className="text-destructive mb-4">{holdingsError}</div>
                <Button onClick={refetch} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your holdings...</p>
              </div>
            ) : portfolioData.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                <p className="text-muted-foreground mb-4">Start investing in Coinporate tokens to see your portfolio here.</p>
                <Button onClick={() => navigate('/')}>
                  Discover Tokens
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolioData.map((holding) => {
                  if (!holding.token) return null;

                  const pnl = holding.currentValue - holding.investedAmount;
                  const pnlPercent = holding.investedAmount > 0 ? ((holding.currentValue - holding.investedAmount) / holding.investedAmount) * 100 : 0;
                  const isPositive = pnl >= 0;

                  return (
                    <div 
                      key={holding.token_mint}
                      className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border hover:bg-card/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/token/${holding.token_mint}`)}
                    >
                      <div className="flex items-center gap-4">
                        {holding.token.image_url ? (
                          <img 
                            src={holding.token.image_url} 
                            alt={holding.token.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                            {holding.token.symbol?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{holding.token.name}</h3>
                            <Badge variant="secondary">{holding.token.symbol}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(holding.balance)} tokens • {formatPrice(holding.currentPrice)} SOL each
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(holding.currentValue)} SOL</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: {formatNumber(holding.balance)}
                        </div>
                        {holding.currentPrice > 0 && (
                          <div className="text-sm text-primary">
                            {formatPrice(holding.currentPrice)} SOL per token
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Portfolio;