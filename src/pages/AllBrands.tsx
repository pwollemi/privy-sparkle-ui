import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface Brand {
  id: string;
  business_name: string;
  industry: string;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

const AllBrands = () => {
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  React.useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setBrands(data);
      } else {
        console.error('Failed to load brands', error);
      }
    };

    fetchBrands();

    const channel = supabase
      .channel('public:brands')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'brands' },
        (payload) => {
          setBrands((prev) => [payload.new as Brand, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          brand.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || brand.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-background">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-bold">All Brands</h2>
            <p className="text-lg text-muted-foreground">Browse verified and pending business claims</p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="md:w-1/3 px-4 py-2 rounded-md border border-input bg-background text-foreground"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <Card key={brand.id} className="bg-card border-border hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <img 
                          src={brand.logo_url} 
                          alt={brand.business_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                          {brand.business_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{brand.business_name}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {brand.industry}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {brand.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(brand.status)}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(brand.status)}`}>
                        {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
                      </span>
                    </div>
                    {brand.website && (
                      <a 
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit Website
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(brand.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No brands found. Be the first to claim your brand!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllBrands;
