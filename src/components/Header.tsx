import React from 'react';
import { useWallet } from '@/lib/wallet';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { isConnected, address, connect, disconnect } = useWallet();
  const navigate = useNavigate();

  const handleConnect = () => {
    if (!isConnected) {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="bg-gradient-primary p-2 rounded-lg shadow-neon-primary group-hover:shadow-neon-accent transition-all duration-300">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold gradient-text">pump.fun</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate('/')}
              className="text-foreground hover:text-primary transition-colors"
            >
              Discover
            </button>
            <button 
              onClick={() => navigate('/create')}
              className="text-foreground hover:text-primary transition-colors"
            >
              Create Token
            </button>
            <button className="text-foreground hover:text-primary transition-colors">
              Portfolio
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="neon-outline"
              size="sm"
              onClick={() => navigate('/create')}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
            
            <Button
              variant={isConnected ? "ghost" : "neon"}
              onClick={handleConnect}
              className="min-w-[120px]"
            >
              <Wallet className="h-4 w-4" />
              {isConnected 
                ? address?.slice(0, 6) + '...' + address?.slice(-4)
                : 'Connect'
              }
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;