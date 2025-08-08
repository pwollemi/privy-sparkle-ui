import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, Plus, User, LogOut, Coins, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

const Header = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { sol, isLoading } = useWalletBalance();
  const navigate = useNavigate();

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
            <span className="text-2xl font-bold gradient-text">Coinporate</span>
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
            <button 
              onClick={() => navigate('/portfolio')}
              className="text-foreground hover:text-primary transition-colors"
            >
              Portfolio
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {authenticated && wallets.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {isLoading ? '...' : `${sol.toFixed(4)} SOL`}
                </span>
              </div>
            )}
            
            <Button
              variant="neon-outline"
              size="sm"
              onClick={() => navigate('/create')}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
            
            {authenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-lg">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium text-foreground">Wallet Address</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="text-xs text-muted-foreground font-mono">
                        {(() => {
                          const wallet = wallets[0];
                          const address = wallet?.address || 'No address';
                          return address.length > 20 ? 
                            (address.slice(0, 8) + '...' + address.slice(-8)) :
                            address;
                        })()}
                      </div>
                      {wallets[0]?.address && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const addr = wallets[0]?.address;
                            if (addr) {
                              navigator.clipboard.writeText(addr);
                              toast({
                                title: 'Copied',
                                description: 'Wallet address copied to clipboard',
                              });
                            }
                          }}
                          aria-label="Copy wallet address"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">SOL Balance</span>
                      <Badge variant="secondary" className="font-mono">
                        {isLoading ? '...' : `${sol.toFixed(4)} SOL`}
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={logout} className="text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="neon"
                onClick={login}
                disabled={!ready}
                className="min-w-[120px]"
              >
                <Wallet className="h-4 w-4" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;