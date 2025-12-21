import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowRight, Star, MapPin, Phone, Mail, Globe, BadgeCheck, 
  Stethoscope, Scissors, Store, GraduationCap, Dog, Share2, Heart,
  Grid3X3, ShoppingBag, MessageCircle, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '@/components/BottomNav';
import { BusinessShopTab } from '@/components/business/BusinessShopTab';
import { BusinessInsights } from '@/components/business/BusinessInsights';

const businessTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  vet: { label: 'וטרינר', icon: <Stethoscope className="w-4 h-4" /> },
  trainer: { label: 'מאלף', icon: <GraduationCap className="w-4 h-4" /> },
  groomer: { label: 'מספרה', icon: <Scissors className="w-4 h-4" /> },
  shop: { label: 'חנות', icon: <Store className="w-4 h-4" /> },
  pet_sitter: { label: 'פט סיטר', icon: <Dog className="w-4 h-4" /> },
};

const BusinessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('shop');

  const { data: business, isLoading } = useQuery({
    queryKey: ['business-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isOwner = user && business?.user_id === user.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        <div className="animate-pulse">
          <div className="h-12 bg-muted border-b" />
          <div className="px-4 py-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20" dir="rtl">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">העסק לא נמצא</h2>
          <Button onClick={() => navigate('/businesses')}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  const typeInfo = businessTypeLabels[business.business_type] || { label: 'עסק', icon: <Store className="w-4 h-4" /> };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Instagram-style Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-12">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-1">
            <h1 className="font-bold text-base truncate max-w-[200px]">
              {business.business_name}
            </h1>
            {business.is_verified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>

          <div className="flex gap-1">
            {isOwner && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section - Compact Instagram Style */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 p-0.5 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {business.business_name.charAt(0)}
                </span>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex-1 flex justify-around pt-2">
            <div className="text-center">
              <div className="font-bold">{business.view_count || 0}</div>
              <div className="text-xs text-muted-foreground">צפיות</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{business.total_reviews || 0}</div>
              <div className="text-xs text-muted-foreground">ביקורות</div>
            </div>
            <div className="text-center">
              <div className="font-bold flex items-center justify-center gap-0.5">
                {business.rating || 0}
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="text-xs text-muted-foreground">דירוג</div>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              {typeInfo.icon}
              {typeInfo.label}
            </Badge>
            {business.city && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {business.city}
              </span>
            )}
          </div>

          {business.description && (
            <p className="text-sm mt-2 leading-relaxed">{business.description}</p>
          )}
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex gap-2 mt-4">
          {business.phone && (
            <Button size="sm" className="flex-1 rounded-lg gap-1.5 h-9" asChild>
              <a href={`tel:${business.phone}`}>
                <Phone className="w-4 h-4" />
                התקשר
              </a>
            </Button>
          )}
          {business.email && (
            <Button variant="outline" size="sm" className="flex-1 rounded-lg gap-1.5 h-9" asChild>
              <a href={`mailto:${business.email}`}>
                <Mail className="w-4 h-4" />
                אימייל
              </a>
            </Button>
          )}
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-lg h-9 w-9">
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        {/* Owner Insights Banner - Simple */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <BusinessInsights 
              viewCount={business.view_count || 0}
              totalReviews={business.total_reviews || 0}
              rating={business.rating || 0}
              businessId={business.id}
            />
          </motion.div>
        )}
      </div>

      {/* Tabs - Instagram Style */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="w-full grid grid-cols-3 bg-transparent border-y rounded-none h-11 p-0">
          <TabsTrigger 
            value="shop"
            className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none h-full"
          >
            <ShoppingBag className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none h-full"
          >
            <Grid3X3 className="w-5 h-5" />
          </TabsTrigger>
          <TabsTrigger 
            value="reviews"
            className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none h-full"
          >
            <MessageCircle className="w-5 h-5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-0">
          <BusinessShopTab businessId={id!} isOwner={isOwner || false} />
        </TabsContent>

        <TabsContent value="about" className="mt-0 p-4 space-y-4">
          {/* Contact Info - Simple Cards */}
          <div className="space-y-3">
            {business.address && (
              <a 
                href={`https://maps.google.com?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">{business.address}</p>
                  {business.city && <p className="text-xs text-muted-foreground">{business.city}</p>}
                </div>
              </a>
            )}
            
            {business.phone && (
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">{business.phone}</span>
              </a>
            )}
            
            {business.website && (
              <a 
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-primary">אתר האינטרנט</span>
              </a>
            )}
          </div>

          {/* Services */}
          {business.services && business.services.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">שירותים</h3>
              <div className="flex flex-wrap gap-2">
                {business.services.map((service: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          {business.price_range && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">טווח מחירים:</span>
              <span>{business.price_range}</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold mb-1">אין ביקורות עדיין</h3>
            <p className="text-muted-foreground text-sm mb-4">
              היה הראשון לכתוב ביקורת
            </p>
            <Button size="sm" className="rounded-xl">כתוב ביקורת</Button>
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default BusinessProfile;
