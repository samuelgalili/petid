import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, Star, MapPin, Phone, Mail, Globe, Clock, BadgeCheck, 
  Stethoscope, Scissors, Store, GraduationCap, Dog, Share2, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import BottomNav from '@/components/BottomNav';

const businessTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  vet: { label: 'וטרינר', icon: <Stethoscope className="w-5 h-5" /> },
  trainer: { label: 'מאלף', icon: <GraduationCap className="w-5 h-5" /> },
  groomer: { label: 'מספרה', icon: <Scissors className="w-5 h-5" /> },
  shop: { label: 'חנות', icon: <Store className="w-5 h-5" /> },
  pet_sitter: { label: 'פט סיטר', icon: <Dog className="w-5 h-5" /> },
};

const BusinessProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        <div className="animate-pulse">
          <div className="h-48 bg-muted" />
          <div className="max-w-lg mx-auto px-4 -mt-16">
            <div className="bg-card rounded-2xl p-6 space-y-4">
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24" dir="rtl">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">העסק לא נמצא</h2>
          <Button onClick={() => navigate('/businesses')}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  const typeInfo = businessTypeLabels[business.business_type] || { label: 'עסק', icon: <Store className="w-5 h-5" /> };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary/30 to-primary/10">
        {business.cover_image_url && (
          <img 
            src={business.cover_image_url} 
            alt={business.business_name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Back Button */}
        <div className="absolute top-4 right-4 left-4 flex justify-between">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-background/80 backdrop-blur"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 shadow-lg border"
        >
          {/* Logo & Name */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-background shadow-md">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {business.business_name.charAt(0)}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{business.business_name}</h1>
                {business.is_verified && (
                  <BadgeCheck className="w-5 h-5 text-primary" />
                )}
              </div>
              
              <Badge variant="outline" className="mt-1 gap-1">
                {typeInfo.icon}
                {typeInfo.label}
              </Badge>

              {business.rating > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{business.rating}</span>
                  <span className="text-muted-foreground text-sm">({business.total_reviews} ביקורות)</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <p className="text-muted-foreground mt-4">{business.description}</p>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 mt-6">
            {business.phone && (
              <Button className="flex-1 gap-2" asChild>
                <a href={`tel:${business.phone}`}>
                  <Phone className="w-4 h-4" />
                  התקשר
                </a>
              </Button>
            )}
            {business.website && (
              <Button variant="outline" className="flex-1 gap-2" asChild>
                <a href={business.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4" />
                  אתר
                </a>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Contact Info */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">פרטי התקשרות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {business.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p>{business.address}</p>
                  {business.city && <p className="text-muted-foreground text-sm">{business.city}</p>}
                </div>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${business.phone}`} className="text-primary hover:underline">
                  {business.phone}
                </a>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${business.email}`} className="text-primary hover:underline">
                  {business.email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        {business.services && business.services.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">שירותים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {business.services.map((service: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {service}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Range */}
        {business.price_range && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">טווח מחירים</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{business.price_range}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BusinessProfile;
