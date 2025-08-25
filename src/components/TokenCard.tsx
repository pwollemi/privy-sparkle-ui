import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';
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
    holders: number;
    createdAt: string;
    creator: string;
  };
}

const TokenCard: React.FC<TokenCardProps> = ({ token }) => {
  const navigate = useNavigate();
  const isPositive = token.change24h >= 0;

  const formatPrice = (price: number) => {
    if (price === 0) return '0.00';
    if (price < 0.000001) return '< 0.000001';
    if (price < 0.01) return price.toFixed(6);
    return price.toFixed(4);
  };

  const formatMarketCap = (cap: number) => {
    if (cap >= 1000000) return `$${(cap / 1000000).toFixed(1)}M`;
    if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}K`;
    return `$${cap.toFixed(0)}`;
  };

  return (
    <Card 
      className="bg-gradient-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group hover:shadow-neon-primary/20"
      onClick={() => navigate(`/token/${token.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <img 
            src={token.image} 
            alt={token.name}
            className="w-12 h-12 rounded-full bg-muted object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{token.name}</h3>
            <p className="text-sm text-muted-foreground">${token.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{formatPrice(token.price)} SOL</p>
            <div className={`flex items-center gap-1 text-xs ${
              isPositive ? 'text-pump-success' : 'text-pump-danger'
            }`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(token.change24h).toFixed(2)}%
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{token.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>MCap: {formatMarketCap(token.marketCap)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{token.holders} holders</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{token.createdAt}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="success" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/token/${token.id}`);
              }}
            >
              Buy
            </Button>
            <Button 
              variant="danger" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/token/${token.id}`);
              }}
            >
              Sell
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCard;