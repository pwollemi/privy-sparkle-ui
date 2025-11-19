import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    description: string;
    image: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume24h?: number;
    holders: number;
    createdAt: string;
    creator: string;
  };
}

const TokenCard: React.FC<TokenCardProps> = ({ token }) => {
  const navigate = useNavigate();
  const isPositive = token.change24h >= 0;

  const formatPrice = (price: number) => {
    if (price === 0) return '$0.00';
    if (price < 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const getIndustry = (name: string) => {
    if (name.toLowerCase().includes('finance') || name.toLowerCase().includes('hub')) return 'Finance';
    if (name.toLowerCase().includes('energy') || name.toLowerCase().includes('green')) return 'Technology';
    if (name.toLowerCase().includes('tech') || name.toLowerCase().includes('corp')) return 'Technology';
    if (name.toLowerCase().includes('health') || name.toLowerCase().includes('medical')) return 'Healthcare';
    if (name.toLowerCase().includes('retail') || name.toLowerCase().includes('mart')) return 'Retail';
    if (name.toLowerCase().includes('food') || name.toLowerCase().includes('chain')) return 'Food';
    return 'Technology';
  };

  return (
    <Card 
      className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/token/${token.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {token.image && token.image !== '/placeholder.svg' ? (
              <img 
                src={token.image} 
                alt={token.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                {token.symbol.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{token.name}</h3>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">${token.symbol}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {getIndustry(token.name)}
          </Badge>
        </div>

        <div className="mb-4">
          <div className="flex items-end gap-2 mb-1">
            <p className="text-3xl font-bold text-foreground">{formatPrice(token.price)}</p>
            <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{token.change24h.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
            <p className="text-base font-semibold text-foreground">{formatValue(token.marketCap)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
            <p className="text-base font-semibold text-foreground">{formatValue(token.volume24h || token.marketCap * 0.23)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCard;