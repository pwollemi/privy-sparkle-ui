import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Rocket, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSolanaProgram } from '@/lib/solana-program';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { supabase } from "@/integrations/supabase/client";

const CreateToken = () => {
  const { toast } = useToast();
  const { connected } = useWallet();
  const { createTokenPool, isConnected, walletAddress } = useSolanaProgram();
  const [isCreating, setIsCreating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    symbol: '',
    description: '',
    totalSupply: 1000000,
    image: null as File | null,
    website: '',
    twitter: '',
    telegram: ''
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.symbol || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to create a token.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const result = await createTokenPool({
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        initialSupply: formData.totalSupply,
        image: formData.image || undefined,
        website: formData.website,
        twitter: formData.twitter,
        telegram: formData.telegram,
      });

      // Upload image to Supabase Storage (if provided)
      let imageUrl: string | null = null;
      if (formData.image) {
        const file = formData.image;
        const ext = file.name.split('.').pop() || 'png';
        const path = `${result.tokenMint}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('token-images')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/png',
          });
        if (uploadError) {
          console.error('Image upload failed:', uploadError);
        } else {
          const { data } = supabase.storage.from('token-images').getPublicUrl(path);
          imageUrl = data.publicUrl;
        }
      }

      // Store token + pool details in Supabase
      const { error: dbError } = await supabase.from('tokens').insert({
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image_url: imageUrl,
        website: formData.website || null,
        twitter: formData.twitter || null,
        telegram: formData.telegram || null,
        pool_address: result.poolAddress,
        config: result.poolDetails?.config ?? null,
        creator: result.poolDetails?.creator ?? walletAddress ?? null,
        base_mint: result.tokenMint,
        pool_type: result.poolDetails?.poolType ?? null,
        activation_point: result.poolDetails?.activationPoint ? Number(result.poolDetails.activationPoint) : null,
        tx_signature: result.signature,
      });

      if (dbError) {
        console.error('Supabase insert error:', dbError);
        toast({
          title: "Saved on-chain, failed to save to Discover",
          description: dbError.message,
          variant: "destructive",
        });
      }

      toast({
        title: "Token Created Successfully! 🚀",
        description: `${formData.symbol} has been launched! Pool: ${result.poolAddress.slice(0, 8)}...`,
      });
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        description: '',
        totalSupply: 1000000,
        image: null,
        website: '',
        twitter: '',
        telegram: ''
      });
    } catch (error) {
      console.error('Token creation error:', error);
      toast({
        title: "Token Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create token. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto mb-6 flex items-center justify-center">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Launch Your Token
          </h1>
          <p className="text-lg text-muted-foreground">
            Create and launch your business token in minutes
          </p>
        </div>

        {/* Wallet Connection Banner */}
        {!connected && (
          <div className="mb-8 p-4 bg-card border border-border rounded-lg flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Connect your wallet to launch tokens</p>
            <WalletMultiButton className="wallet-button" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Token Details */}
          <Card className="bg-card border-border h-fit">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Token Details</CardTitle>
              <p className="text-sm text-muted-foreground">Configure your token parameters</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium mb-2 block">Token Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Apple Inc."
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-background"
                />
              </div>

              <div>
                <Label htmlFor="symbol" className="text-sm font-medium mb-2 block">Token Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AAPL"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                  className="bg-background"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Total Supply</Label>
                  <span className="text-lg font-bold">{formData.totalSupply.toLocaleString()}</span>
                </div>
                <Slider
                  value={[formData.totalSupply]}
                  onValueChange={([value]) => handleInputChange('totalSupply', value)}
                  min={100000}
                  max={10000000}
                  step={100000}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">Adjust the total supply of tokens to be created</p>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium mb-2 block">Token Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your token and its utility..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-background min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={isCreating || !isConnected}
                className="w-full bg-muted hover:bg-muted/80 text-foreground"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Launch Token
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <span className="text-lg">📈</span> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Token Preview Card */}
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl text-white font-bold">
                      {formData.symbol ? formData.symbol.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{formData.name || 'Your Token Name'}</h3>
                      <p className="text-muted-foreground">${formData.symbol || 'SYMBOL'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
                      <p className="text-2xl font-bold">{formData.totalSupply.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-2xl font-bold">TBD</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">💬</span>
                      <p className="font-semibold">Token Description</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'Your token description will appear here...'}
                    </p>
                  </div>
                </div>

                {/* Launch Benefits */}
                <div className="bg-gradient-to-br from-primary to-accent rounded-lg p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">Launch Benefits</h3>
                  <div className="space-y-3">
                    {[
                      'Instant token creation',
                      'Automatic liquidity pool',
                      'Built-in trading interface',
                      'Real-time price tracking'
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateToken;