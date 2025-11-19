import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';

const ClaimBrand = () => {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    businessName: '',
    industry: '',
    website: '',
    description: '',
    logo: null as File | null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.businessName || !formData.industry) {
      toast({
        title: "Missing Information",
        description: "Please fill in business name and industry.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      let logoUrl: string | null = null;

      // Upload logo to Supabase Storage if provided
      if (formData.logo) {
        const file = formData.logo;
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('token-images')
          .upload(`brands/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/png',
          });

        if (uploadError) {
          console.error('Logo upload failed:', uploadError);
        } else {
          const { data } = supabase.storage.from('token-images').getPublicUrl(`brands/${fileName}`);
          logoUrl = data.publicUrl;
        }
      }

      // Store brand claim in Supabase
      const { error: dbError } = await supabase.from('brands').insert({
        business_name: formData.businessName,
        industry: formData.industry,
        website: formData.website || null,
        description: formData.description || null,
        logo_url: logoUrl,
        creator_wallet: publicKey?.toString() || null,
        status: 'pending',
      });

      if (dbError) {
        console.error('Supabase insert error:', dbError);
        toast({
          title: "Submission Failed",
          description: dbError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Brand Claim Submitted! ✓",
        description: "Your brand claim has been submitted for review. We'll notify you once it's approved.",
      });
      
      // Reset form and navigate
      setFormData({
        businessName: '',
        industry: '',
        website: '',
        description: '',
        logo: null,
      });

      setTimeout(() => {
        navigate('/all-brands');
      }, 2000);
    } catch (error) {
      console.error('Brand claim error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit brand claim. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto mb-6 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Claim Your Brand
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Register your legitimate business and create your company token
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Business Information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Provide accurate information about your business. All claims are verified before approval.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="businessName" className="text-sm font-medium mb-2 block">
                Search for Your Business
              </Label>
              <Input
                id="businessName"
                placeholder="Search business name..."
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="bg-background"
              />
            </div>

            <div>
              <Label htmlFor="industry" className="text-sm font-medium mb-2 block">
                Industry *
              </Label>
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-input bg-background text-foreground"
              >
                <option value="">Select your industry</option>
                <option value="Finance">Finance</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Retail">Retail</option>
                <option value="Food">Food</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="website" className="text-sm font-medium mb-2 block">
                Company Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="bg-background"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                Business Description
              </Label>
              <Textarea
                id="description"
                placeholder="Tell us about your business..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-background min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="logo" className="text-sm font-medium mb-2 block">
                Company Logo
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="logo"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => document.getElementById('logo')?.click()}
                  className="w-full"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  {formData.logo ? formData.logo.name : 'Click to upload or drag and drop'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG or SVG (max. 2MB)
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-muted hover:bg-muted/80 text-foreground"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Brand Claim'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClaimBrand;
