import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Star, MapPin, Phone, Clock, BadgeCheck, Search, Stethoscope, Scissors, Store, GraduationCap, Dog, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { SEO } from '@/components/SEO';

type BusinessType = 'all' | 'vet' | 'trainer' | 'groomer' | 'shop' | 'pet_sitter' | 'shelter';

const businessTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  vet: { label: 'וטרינר', icon: <Stethoscope className="w-4 h-4" /> },
  trainer: { label: 'מאלף', icon: <GraduationCap className="w-4 h-4" /> },
  groomer: { label: 'מספרה', icon: <Scissors className="w-4 h-4" /> },
  shop: { label: 'חנות', icon: <Store className="w-4 h-4" /> },
  pet_sitter: { label: 'פט סיטר', icon: <Dog className="w-4 h-4" /> },
  shelter: { label: 'עמותה', icon: <Heart className="w-4 h-4" /> },
};

const BusinessDirectory = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<BusinessType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['business-profiles', selectedType, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('business_profiles')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('business_type', selectedType);
      }

      if (searchQuery) {
        query = query.or(`business_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20" dir="rtl">
      <SEO title="עסקים" description="מצאו וטרינרים, מאלפים, מספרות כלבים ועוד שירותים לחיות מחמד" url="/businesses" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">עסקים לחיות מחמד</h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם או עיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as BusinessType)}>
            <TabsList className="w-full overflow-x-auto flex justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="all" className="rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                הכל
              </TabsTrigger>
              {Object.entries(businessTypeLabels).map(([key, { label, icon }]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="rounded-full px-4 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {icon}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : businesses?.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">אין עסקים להצגה</h3>
            <p className="text-muted-foreground">נסה לשנות את הפילטרים או לחפש משהו אחר</p>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses?.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-card rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  business.is_featured ? 'ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : ''
                }`}
                onClick={() => navigate(`/business/${business.id}`)}
              >
                <div className="flex gap-4">
                  {/* Logo */}
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-primary">
                        {business.business_name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">{business.business_name}</h3>
                        {business.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      {business.is_featured && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs flex-shrink-0">
                          מומלץ
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs gap-1">
                        {businessTypeLabels[business.business_type]?.icon}
                        {businessTypeLabels[business.business_type]?.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      {business.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{business.rating}</span>
                          <span className="text-xs">({business.total_reviews})</span>
                        </div>
                      )}
                      {business.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{business.city}</span>
                        </div>
                      )}
                    </div>

                    {business.price_range && (
                      <p className="text-xs text-muted-foreground mt-1">{business.price_range}</p>
                    )}
                  </div>
                </div>

                {/* Services Preview */}
                {business.services && business.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                    {business.services.slice(0, 3).map((service: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {business.services.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{business.services.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BusinessDirectory;
