import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price_ils: number;
  billing_period: string | null;
  active: boolean;
}

const benefitsByType: Record<string, string[]> = {
  one_time: [
    "גישה לכל התכונות הבסיסיות",
    "תמיכה בדוא״ל",
    "ללא התחייבות"
  ],
  monthly: [
    "גישה מלאה לכל התכונות",
    "תמיכה מועדפת 24/7",
    "עדכונים אוטומטיים",
    "גיבוי נתונים יומי"
  ],
  yearly: [
    "חיסכון של 20% לשנה",
    "גישה מלאה לכל התכונות",
    "תמיכה VIP",
    "עדכונים אוטומטיים",
    "גיבוי נתונים יומי",
    "בונוסים בלעדיים"
  ]
};

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [authLoading2, setAuthLoading2] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['cardcom-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cardcom_products')
        .select('*')
        .eq('active', true)
        .order('price_ils', { ascending: true });
      
      if (error) throw error;
      return data as Product[];
    }
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading2(true);

    try {
      if (authTab === "signup") {
        const redirectUrl = `${window.location.origin}/pricing`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        toast({
          title: "נרשמת בהצלחה!",
          description: "בדוק את תיבת הדוא״ל שלך לאימות החשבון",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast({
          title: "התחברת בהצלחה!",
        });
      }
      
      setShowAuthModal(false);
      setEmail("");
      setPassword("");
      setFullName("");
      
      // If there was a selected product, proceed to checkout
      if (selectedProduct) {
        setTimeout(() => handleCheckout(selectedProduct), 500);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא צפויה";
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAuthLoading2(false);
    }
  };

  const handleCheckout = async (product: Product) => {
    if (!user) {
      setSelectedProduct(product);
      setShowAuthModal(true);
      return;
    }

    setCheckoutLoading(product.id);

    try {
      const endpoint = product.type === 'subscription' 
        ? 'create-subscription' 
        : 'create-payment-intent';
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          product_id: product.id,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/pricing`
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        // Redirect to CardCom payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error("לא התקבל קישור לתשלום");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "שגיאה בעת יצירת התשלום";
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getProductIcon = (product: Product) => {
    if (product.type === 'one_time') return <Shield className="h-8 w-8 text-primary" />;
    if (product.billing_period === 'yearly') return <Sparkles className="h-8 w-8 text-accent" />;
    return <Clock className="h-8 w-8 text-primary" />;
  };

  const getButtonText = (product: Product) => {
    if (product.type === 'one_time') return "לתשלום חד פעמי";
    return "להתחיל מנוי";
  };

  const getBenefits = (product: Product) => {
    if (product.type === 'one_time') return benefitsByType.one_time;
    if (product.billing_period === 'yearly') return benefitsByType.yearly;
    return benefitsByType.monthly;
  };

  const formatPrice = (price: number, billingPeriod: string | null) => {
    if (billingPeriod === 'yearly') {
      const monthlyPrice = Math.round(price / 12);
      return (
        <div className="text-center">
          <span className="text-4xl font-bold">₪{monthlyPrice}</span>
          <span className="text-muted-foreground">/חודש</span>
          <div className="text-sm text-muted-foreground mt-1">
            ₪{price} לשנה
          </div>
        </div>
      );
    }
    if (billingPeriod === 'monthly') {
      return (
        <div className="text-center">
          <span className="text-4xl font-bold">₪{price}</span>
          <span className="text-muted-foreground">/חודש</span>
        </div>
      );
    }
    return (
      <div className="text-center">
        <span className="text-4xl font-bold">₪{price}</span>
        <span className="text-muted-foreground"> חד פעמי</span>
      </div>
    );
  };

  if (productsLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">מחירון</h1>
          {user ? (
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              התנתק
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowAuthModal(true)}>
              התחבר
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">בחר את החבילה המתאימה לך</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            אנחנו מציעים מגוון חבילות גמישות שמתאימות לכל צורך. בחר את החבילה שמתאימה לך והתחל עוד היום.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {products?.map((product, index) => {
            const isPopular = product.billing_period === 'yearly';
            return (
              <Card 
                key={product.id}
                className={`relative flex flex-col transition-all hover:shadow-lg ${
                  isPopular ? 'border-primary shadow-md scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 right-1/2 translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                      הכי משתלם
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    {getProductIcon(product)}
                  </div>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <CardDescription className="min-h-[48px]">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="mb-6">
                    {formatPrice(product.price_ils, product.billing_period)}
                  </div>
                  
                  <ul className="space-y-3">
                    {getBenefits(product).map((benefit, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-success shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleCheckout(product)}
                    disabled={checkoutLoading === product.id}
                  >
                    {checkoutLoading === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : null}
                    {getButtonText(product)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">תשלום מאובטח באמצעות</p>
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5" />
              <span>SSL מאובטח</span>
            </div>
            <div className="text-muted-foreground font-semibold">
              CardCom
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>התחברות לחשבון</DialogTitle>
            <DialogDescription>
              התחבר או הירשם כדי להמשיך לתשלום
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">התחברות</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleAuth}>
              <TabsContent value="login" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">דוא״ל</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading2}>
                  {authLoading2 && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  התחבר
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">שם מלא</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="ישראל ישראלי"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">דוא״ל</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">סיסמה</Label>
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading2}>
                  {authLoading2 && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  הירשם
                </Button>
              </TabsContent>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
