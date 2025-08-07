import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TokenCard from '@/components/TokenCard';
import { mockTokens } from '@/data/mockTokens';
import { Search, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredTokens = mockTokens.filter(token =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-2 h-2 bg-neon-pink rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-1 h-1 bg-neon-green rounded-full animate-bounce" />
          <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-neon-blue rounded-full animate-float" />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-bold gradient-text">
              pump.fun
            </h1>
            <Zap className="h-8 w-8 text-secondary animate-bounce" />
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The ultimate platform for launching and trading meme coins. 
            Create your token in seconds, no coding required!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => navigate('/create')}
              className="neon-glow"
            >
              <TrendingUp className="h-6 w-6" />
              Launch Your Token
            </Button>
            <Button 
              variant="neon-outline" 
              size="xl"
              onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Discover Tokens
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card/50 p-6 rounded-lg border border-border backdrop-blur-sm">
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Tokens Launched</div>
            </div>
            <div className="bg-card/50 p-6 rounded-lg border border-border backdrop-blur-sm">
              <div className="text-3xl font-bold text-secondary mb-2">$50M+</div>
              <div className="text-muted-foreground">Trading Volume</div>
            </div>
            <div className="bg-card/50 p-6 rounded-lg border border-border backdrop-blur-sm">
              <div className="text-3xl font-bold text-accent mb-2">25,000+</div>
              <div className="text-muted-foreground">Active Traders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Discovery Section */}
      <section id="discover" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Discover <span className="gradient-text">Trending Tokens</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Find the next 1000x gem before it moons. Early birds get the biggest gains!
            </p>
          </div>

          <div className="relative max-w-md mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 backdrop-blur-sm border-border focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>

          {filteredTokens.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No tokens found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;