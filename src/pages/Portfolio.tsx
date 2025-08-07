import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockTokens } from '@/data/mockTokens';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from 'lucide-react';

const Portfolio = () => {
  const navigate = useNavigate();

  // Mock user holdings
  const userHoldings = [
    {
      tokenId: 'pepe-moon',
      amount: 150000,
      investedAmount: 45,
      currentValue: 102.6,
    },
    {
      tokenId: 'shiba-rocket', 
      amount: 50000,
      investedAmount: 20,
      currentValue: 15.8,
    },
    {
      tokenId: 'cat-coin',
      amount: 8500,
      investedAmount: 15,
      currentValue: 19.9,
    }
  ];

  const totalInvested = userHoldings.reduce((sum, holding) => sum + holding.investedAmount, 0);
  const totalValue = userHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalPnL = totalValue - totalInvested;
  const totalPnLPercent = ((totalValue - totalInvested) / totalInvested) * 100;

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(2);
    return price.toFixed(6);
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
          <p className="text-muted-foreground">Track your pump.fun token investments</p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-foreground">${totalValue.toFixed(2)}</div>
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
              <div className="text-2xl font-bold text-foreground">${totalInvested.toFixed(2)}</div>
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
                ${Math.abs(totalPnL).toFixed(2)}
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

        {/* Holdings */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Your Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userHoldings.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                <p className="text-muted-foreground mb-4">Start investing in pump.fun tokens to see your portfolio here.</p>
                <Button onClick={() => navigate('/')}>
                  Discover Tokens
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userHoldings.map((holding) => {
                  const token = mockTokens.find(t => t.id === holding.tokenId);
                  if (!token) return null;

                  const pnl = holding.currentValue - holding.investedAmount;
                  const pnlPercent = ((holding.currentValue - holding.investedAmount) / holding.investedAmount) * 100;
                  const isPositive = pnl >= 0;

                  return (
                    <div 
                      key={holding.tokenId}
                      className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border hover:bg-card/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/token/${token.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={token.image} 
                          alt={token.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{token.name}</h3>
                            <Badge variant="secondary">{token.symbol}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(holding.amount)} tokens • ${formatPrice(token.price)} each
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">${holding.currentValue.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          Invested: ${holding.investedAmount.toFixed(2)}
                        </div>
                        <div className={`text-sm font-medium flex items-center gap-1 ${
                          isPositive ? 'text-pump-success' : 'text-pump-danger'
                        }`}>
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? '+' : ''}${Math.abs(pnl).toFixed(2)} ({pnlPercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Portfolio;