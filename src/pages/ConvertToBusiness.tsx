import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Store, Stethoscope, Scissors, GraduationCap, Dog, Heart,
  ArrowRight, CheckCircle, Loader2, Building2, Phone, Mail, Globe, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

const businessTypes = [
  { value: 'vet', label: 'וטרינר', icon: Stethoscope, description: 'שירותי רפואה וטרינרית' },
  { value: 'trainer', label: 'מאלף', icon: GraduationCap, description: 'אילוף והדרכה' },
  { value: 'groomer', label: 'מספרה', icon: Scissors, description: 'טיפוח וגזירה' },
  { value: 'shop', label: 'חנות', icon: Store, description: 'מכירת מוצרים' },
  { value: 'pet_sitter', label: 'פט סיטר', icon: Dog, description: 'שמירה ופנסיון' },
  { value: 'shelter', label: 'עמותה', icon: Heart, description: 'עמותה לאימוץ וחילוץ' },
];

const ConvertToBusiness = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    services: '',
  });

  // Check if user already has a business
  const { data: existingBusiness, isLoading: checkingBusiness } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createBusinessMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedType) throw new Error('Missing data');

      const servicesArray = formData.services
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          business_name: formData.businessName,
          business_type: selectedType as any,
          description: formData.description || null,
          phone: formData.phone || null,
          email: formData.email || user.email,
          website: formData.website || null,
          address: formData.address || null,
          city: formData.city || null,
          services: servicesArray.length > 0 ? servicesArray : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      toast.success('🎉 החשבון העסקי נוצר בהצלחה!');
      navigate(`/business/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה ביצירת החשבון העסקי');
    },
  });

  if (checkingBusiness) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // User already has a business
  if (existingBusiness) {
    return (
      <div className="min-h-screen bg-background pb-24" dir="rtl">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">חשבון עסקי</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8">
          <Card className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">כבר יש לך חשבון עסקי!</h2>
            <p className="text-muted-foreground mb-6">
              העסק שלך: {existingBusiness.business_name}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(`/business/${existingBusiness.id}`)}>
                צפה בפרופיל העסק
              </Button>
              <Button variant="outline" onClick={() => navigate('/settings')}>
                חזרה להגדרות
              </Button>
            </div>
          </Card>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">המרה לחשבון עסקי</h1>
            <p className="text-sm text-muted-foreground">שלב {step} מתוך 3</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Choose Business Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold mb-2">מה סוג העסק שלך?</h2>
              <p className="text-muted-foreground">בחר את הקטגוריה שמתאימה לעסק שלך</p>
            </div>

            <div className="space-y-3">
              {businessTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <Card
                    key={type.value}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button 
              className="w-full" 
              size="lg"
              disabled={!selectedType}
              onClick={() => setStep(2)}
            >
              המשך
            </Button>
          </motion.div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold mb-2">פרטי העסק</h2>
              <p className="text-muted-foreground">ספר לנו על העסק שלך</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">שם העסק *</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    placeholder="שם העסק שלך"
                    className="pr-10"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  placeholder="ספר על העסק שלך..."
                  className="mt-1"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="services">שירותים (מופרדים בפסיק)</Label>
                <Input
                  id="services"
                  placeholder="טיפול, תספורת, רחצה..."
                  className="mt-1"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                חזרה
              </Button>
              <Button 
                className="flex-1" 
                disabled={!formData.businessName}
                onClick={() => setStep(3)}
              >
                המשך
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold mb-2">פרטי התקשרות</h2>
              <p className="text-muted-foreground">איך לקוחות יכולים לפנות אליך?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">טלפון</Label>
                <div className="relative mt-1">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="050-1234567"
                    className="pr-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">אימייל</Label>
                <div className="relative mt-1">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@business.com"
                    className="pr-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">אתר אינטרנט</Label>
                <div className="relative mt-1">
                  <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="website"
                    placeholder="https://www.example.com"
                    className="pr-10"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">עיר</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="תל אביב"
                      className="pr-10"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">כתובת</Label>
                  <Input
                    id="address"
                    placeholder="רחוב, מספר"
                    className="mt-1"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <Card className="p-4 bg-muted/30">
              <h3 className="font-bold mb-2">סיכום</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {businessTypes.find(t => t.value === selectedType)?.label}
                  </Badge>
                </div>
                <p><strong>שם:</strong> {formData.businessName}</p>
                {formData.city && <p><strong>עיר:</strong> {formData.city}</p>}
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                חזרה
              </Button>
              <Button 
                className="flex-1"
                onClick={() => createBusinessMutation.mutate()}
                disabled={createBusinessMutation.isPending}
              >
                {createBusinessMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    יוצר...
                  </>
                ) : (
                  'צור חשבון עסקי'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ConvertToBusiness;
