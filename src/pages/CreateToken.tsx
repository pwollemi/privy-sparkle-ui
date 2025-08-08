import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Rocket, AlertCircle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSolanaProgram } from '@/lib/solana-program';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const CreateToken = () => {
  const { toast } = useToast();
  const { connected } = useWallet();
  const { createTokenPool, isConnected, walletAddress } = useSolanaProgram();
  const [isCreating, setIsCreating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    symbol: '',
    description: '',
    image: null as File | null,
    initialSupply: '',
    website: '',
    twitter: '',
    telegram: ''
  });

  const handleInputChange = (field: string, value: string) => {
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
        initialSupply: parseInt(formData.initialSupply) || 1000000000,
        image: formData.image || undefined,
        website: formData.website,
        twitter: formData.twitter,
        telegram: formData.telegram,
      });

      toast({
        title: "Token Created Successfully! 🚀",
        description: `${formData.symbol} has been launched! Pool: ${result.poolAddress.slice(0, 8)}...`,
      });
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        description: '',
        image: null,
        initialSupply: '',
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
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Create Your <span className="gradient-text">Meme Token</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Launch your token in minutes! No coding required, just pure meme magic.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Token Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Token Name *</Label>
                  <Input
                    id="name"
                    placeholder="Pepe Moon"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-input/50"
                  />
                </div>
                <div>
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    placeholder="PMOON"
                    value={formData.symbol}
                    onChange={(e) => handleInputChange('symbol', e.target.value)}
                    className="bg-input/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="The ultimate meme coin that's going to the moon! 🚀"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-input/50 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="supply">Initial Supply</Label>
                <Input
                  id="supply"
                  placeholder="1000000000"
                  type="number"
                  value={formData.initialSupply}
                  onChange={(e) => handleInputChange('initialSupply', e.target.value)}
                  className="bg-input/50"
                />
              </div>

              <div>
                <Label htmlFor="image">Token Image</Label>
                <div className="relative">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('image')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.image ? formData.image.name : 'Upload Image'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Links (Optional)</h3>
                <Input
                  placeholder="Website URL"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="bg-input/50"
                />
                <Input
                  placeholder="Twitter Handle"
                  value={formData.twitter}
                  onChange={(e) => handleInputChange('twitter', e.target.value)}
                  className="bg-input/50"
                />
                <Input
                  placeholder="Telegram Channel"
                  value={formData.telegram}
                  onChange={(e) => handleInputChange('telegram', e.target.value)}
                  className="bg-input/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview & Launch */}
          <div className="space-y-6">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Token Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center">
                    {formData.image ? (
                      <img 
                        src={URL.createObjectURL(formData.image)} 
                        alt="Token"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Rocket className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{formData.name || 'Token Name'}</h3>
                  <p className="text-muted-foreground">${formData.symbol || 'SYMBOL'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.description || 'Token description will appear here...'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {!connected ? (
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-primary mt-1" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary mb-1">Connect Wallet</p>
                      <p className="text-muted-foreground mb-3">
                        Connect your Solana wallet to create and deploy tokens on-chain.
                      </p>
                      <WalletMultiButton />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : isConnected ? (
              <Card className="bg-card/50 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-green-500 mt-1" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-500 mb-1">Wallet Connected</p>
                      <p className="text-muted-foreground">
                        {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : 'Connected'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-1" />
                    <div className="text-sm">
                      <p className="font-semibold text-orange-500 mb-1">No Solana Wallet</p>
                      <p className="text-muted-foreground">
                        Please connect a Solana wallet to create tokens on-chain.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              variant="hero"
              size="xl"
              onClick={handleCreate}
              disabled={isCreating || !isConnected}
              className="w-full neon-glow"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  Launching to the Moon...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  Launch Token 🚀
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateToken;