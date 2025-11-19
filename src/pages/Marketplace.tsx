import React from 'react';
import { Input } from '@/components/ui/input';
import TokenCard from '@/components/TokenCard';
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp } from 'lucide-react';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { connection } from '@/lib/solana-program';
import { PublicKey } from '@solana/web3.js';

const Marketplace = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tokens, setTokens] = React.useState<any[]>([]);
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({});

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
        if (!cancelled) setPriceMap(Object.fromEntries(entries));
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
    <div className="min-h-screen py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-bold">Token Marketplace</h2>
            <p className="text-lg text-muted-foreground">Discover and trade tokens from verified businesses</p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <select className="md:w-1/3 px-4 py-2 rounded-md border border-input bg-background text-foreground">
            <option>All Industries</option>
            <option>Finance</option>
            <option>Technology</option>
            <option>Healthcare</option>
            <option>Retail</option>
            <option>Food</option>
          </select>
          <select className="md:w-1/3 px-4 py-2 rounded-md border border-input bg-background text-foreground">
            <option>Market Cap</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Volume: High to Low</option>
          </select>
        </div>

        {/* Token Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.length > 0 ? (
            cards.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No tokens found. Be the first to create one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
