import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TokenCard from '@/components/TokenCard';
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { connection } from '@/lib/solana-program';
import { PublicKey } from '@solana/web3.js';

const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tokens, setTokens] = React.useState<any[]>([]);
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({});
  const [totalVolume, setTotalVolume] = React.useState(0);
  const [activeTraders, setActiveTraders] = React.useState(0);
  const [solPrice, setSolPrice] = React.useState(0);

  React.useEffect(() => {
    const fetchTokens = async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setTokens(data ?? []);
      else console.error('Failed to load tokens', error);
    };
    fetchTokens();

    const channel = supabase
      .channel('public:tokens')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tokens' },
        (payload) => {
          setTokens((prev) => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch trading statistics from database
  React.useEffect(() => {
  const fetchTradingStats = async () => {
      try {
        // Fetch SOL price first
        const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const solPriceData = await solPriceResponse.json();
        const currentSolPrice = solPriceData.solana?.usd || 0;
        setSolPrice(currentSolPrice);

        // Get total trading volume (all time)
        const { data: volumeData, error: volumeError } = await supabase
          .from('price_history')
          .select('volume_sol')
          .not('volume_sol', 'is', null);

        if (!volumeError && volumeData) {
          const totalVol = volumeData.reduce((sum, entry) => sum + (Number(entry.volume_sol) || 0), 0);
          setTotalVolume(totalVol);
        }

        // Get active traders (unique wallets from last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: tradersData, error: tradersError } = await supabase
          .from('price_history')
          .select('user_wallet')
          .gte('timestamp', thirtyDaysAgo)
          .not('user_wallet', 'is', null);

        if (!tradersError && tradersData) {
          const uniqueWallets = new Set(tradersData.map(item => item.user_wallet));
          setActiveTraders(uniqueWallets.size);
        }
      } catch (error) {
        console.error('Error fetching trading stats:', error);
      }
    };

    fetchTradingStats();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadPrices = async () => {
      if (!tokens.length) {
        setPriceMap({});
        return;
      }
      try {
        const client = new DynamicBondingCurveClient(connection, 'confirmed');
        const entries = await Promise.all(tokens.map(async (t) => {
          if (!t.pool_address) return [t.base_mint as string, 0] as const;
          try {
            const state = await client.state.getPool(new PublicKey(t.pool_address));
            const sqrt: any = (state as any)?.account?.sqrtPrice ?? (state as any)?.sqrtPrice;
            const n = Number(sqrt?.toString?.() ?? sqrt);
            const price = !n || !isFinite(n) ? 0 : n / 2 ** 63;
            return [t.base_mint as string, price] as const;
          } catch {
            return [t.base_mint as string, 0] as const;
          }
        }));
        if (!cancelled) {
          const map: Record<string, number> = {};
          for (const [k, v] of entries) map[k] = v;
          setPriceMap(map);
        }
      } catch (e) {
        console.error('Failed to compute prices', e);
      }
    };
    loadPrices();
    return () => { cancelled = true; };
  }, [tokens]);

  const cards = tokens
    .map((t) => ({
      id: t.base_mint,
      name: t.name,
      symbol: t.symbol,
      description: t.description ?? '',
      image: t.image_url ?? '/placeholder.svg',
      price: priceMap[t.base_mint] ?? 0,
      change24h: 0,
      marketCap: 0,
      holders: 0,
      createdAt: new Date(t.created_at).toLocaleDateString(),
      creator: t.creator ?? '',
    }))
    .filter(
      (token) =>
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
              Coinporate
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
              <div className="text-3xl font-bold text-primary mb-2">{tokens.length.toLocaleString()}</div>
              <div className="text-muted-foreground">Tokens Launched</div>
            </div>
            <div className="bg-card/50 p-6 rounded-lg border border-border backdrop-blur-sm">
              <div className="text-3xl font-bold text-secondary mb-2">
                {totalVolume > 0 && solPrice > 0 
                  ? `$${((totalVolume * solPrice) / 1000000).toFixed(1)}M` 
                  : '$0.0M'
                }
              </div>
              <div className="text-muted-foreground">Trading Volume</div>
            </div>
            <div className="bg-card/50 p-6 rounded-lg border border-border backdrop-blur-sm">
              <div className="text-3xl font-bold text-accent mb-2">
                {activeTraders.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Active Traders (30d)</div>
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
            {cards.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>

          {cards.length === 0 && (
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