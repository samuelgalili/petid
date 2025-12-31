import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Check, 
  X, 
  Heart, 
  Activity, 
  Pill, 
  Syringe,
  FileText,
  Calendar,
  AlertCircle,
  ChevronDown,
  Award,
  Building2,
  Phone,
  Clock,
  MapPin,
  Stethoscope,
  Home,
  Users,
  AlertTriangle,
  Star,
  Sparkles,
  Shield,
  TrendingUp,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";
import { Pricing, PricingTier } from "@/components/ui/pricing-table";

const Insurance = () => {
  const { toast } = useToast();
  const [calculatorData, setCalculatorData] = useState({
    petType: 'dog' as 'dog' | 'cat',
    petAge: 3,
    breed: '' as string,
    isNeutered: false,
  });
  const [calculatedPremium, setCalculatedPremium] = useState<number | null>(null);

  const pricingTiers: PricingTier[] = [
    {
      name: "מסלול מקיף",
      description: "כיסוי מלא למחלות ותאונות - ההמלצה שלנו",
      price: 149,
      billingPeriod: "לחודש",
      buttonText: "הצטרף עכשיו",
      buttonVariant: "default",
      isPrimary: true,
      featuresTitle: "מה כלול?",
      features: [
        { text: "כיסוי תאונות ופציעות" },
        { text: "כיסוי מחלות וזיהומים" },
        { text: "ניתוחים והליכים רפואיים" },
        { text: "בדיקות דיאגנוסטיות (MRI, CT, אולטרסאונד)" },
        { text: "תרופות במרשם" },
        { text: "פיזיותרפיה והידרותרפיה" },
        { text: "מזון רפואי (14 יום)" },
        { text: "אשפוז בבית חולים" },
        { text: "תקרה שנתית: ₪30,000", hasInfo: true },
      ],
    },
    {
      name: "מסלול תאונות",
      description: "כיסוי לתאונות בלבד - מחיר משתלם",
      price: 79,
      billingPeriod: "לחודש",
      buttonText: "הצטרף עכשיו",
      buttonVariant: "outline",
      isPrimary: false,
      featuresTitle: "מה כלול?",
      features: [
        { text: "כיסוי תאונות ופציעות" },
        { text: "ניתוחים בעקבות תאונה" },
        { text: "בדיקות דיאגנוסטיות" },
        { text: "תרופות במרשם" },
        { text: "פיזיותרפיה (עד 4 טיפולים)" },
        { text: "כיסוי עד 90 יום לתאונה" },
        { text: "תקרה שנתית: ₪30,000", hasInfo: true },
      ],
    },
    {
      name: "מסלול פרימיום",
      description: "הכיסוי המקיף ביותר לחיית המחמד שלך",
      price: 249,
      billingPeriod: "לחודש",
      buttonText: "צור קשר",
      buttonVariant: "secondary",
      isPrimary: false,
      featuresTitle: "הכל מהמקיף ועוד:",
      features: [
        { text: "כל מה שבמסלול המקיף" },
        { text: "כיסוי טיפולי סרטן וכימותרפיה" },
        { text: "כיסוי מצבים כרוניים ללא הגבלה" },
        { text: "ביקורי בית של וטרינר" },
        { text: "כיסוי בחו״ל עד ₪10,000" },
        { text: "טיפול התנהגותי" },
        { text: "ללא השתתפות עצמית" },
        { text: "תקרה שנתית: ₪50,000", hasInfo: true },
      ],
    },
  ];

  const handleTierSelect = (tierName: string) => {
    const colors = ['#F7BF00', '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'];
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors
    });
    toast({
      title: `בחרת ב${tierName}! 🎉`,
      description: "נציג יצור איתך קשר בהקדם.",
    });
  };

  const coverageCategories = [
    {
      icon: AlertCircle,
      title: "תאונות ופציעות",
      description: "נשיכות, קריעת רצועות, הכשת נחש, תאונות דרכים",
      gradient: "from-rose-400 to-red-500",
    },
    {
      icon: Activity,
      title: "מחלות",
      description: "בדיקות, ביופסיה, הדמיות - מאבחון עד החלמה",
      gradient: "from-blue-400 to-indigo-500",
    },
    {
      icon: Heart,
      title: "מצבים כרוניים",
      description: "אלרגיות, סוכרת, כשל כלייתי, מצבי לב",
      gradient: "from-purple-400 to-violet-500",
    },
    {
      icon: Star,
      title: "מצבים גנטיים",
      description: "מחלות אופייניות לגזע ומצבים תורשתיים",
      gradient: "from-amber-400 to-orange-500",
    },
  ];

  const keyBenefits = [
    { icon: ShieldCheck, title: "כיסוי מקיף", desc: "מחלות ותאונות", gradient: "from-amber-400 to-orange-500" },
    { icon: Clock, title: "תקופת אכשרה", desc: "45 יום", gradient: "from-blue-400 to-indigo-500" },
    { icon: Award, title: "תקרה שנתית", desc: "₪30,000", gradient: "from-emerald-400 to-teal-500" },
    { icon: Calendar, title: "תקופת ביטוח", desc: "עד 5 שנים", gradient: "from-pink-400 to-rose-500" },
  ];

  const faqItems = [
    {
      id: "faq-1",
      question: "מתי הביטוח נכנס לתוקף?",
      answer: "כיסוי תאונות נכנס לתוקף 72 שעות מתחילת הביטוח. כיסוי מחלות נכנס לתוקף לאחר תקופת אכשרה של 45 יום.",
    },
    {
      id: "faq-2",
      question: "האם יש הגבלת גיל לחיות?",
      answer: "ניתן לבטח חיות מגיל 8 שבועות ועד גיל 12 שנים. חיות מבוטחות יכולות להמשיך להיות מבוטחות ללא הגבלת גיל.",
    },
    {
      id: "faq-3",
      question: "מה התקרה השנתית?",
      answer: "התקרה השנתית המקסימלית היא ₪30,000 לשני המסלולים הראשונים ו-₪50,000 למסלול הפרימיום.",
    },
    {
      id: "faq-4",
      question: "מהי השתתפות עצמית?",
      answer: "ההשתתפות העצמית נעה בין ₪250-500 לכל אירוע, תלוי במסלול הנבחר ובגיל חיית המחמד. במסלול פרימיום אין השתתפות עצמית.",
    },
    {
      id: "faq-5",
      question: "האם מכוסים מצבים כרוניים?",
      answer: "כן! במסלול המקיף והפרימיום מכוסים מצבים כרוניים כגון סוכרת, אלרגיות, כשל כלייתי ומחלות לב.",
    },
    {
      id: "faq-6",
      question: "איך מגישים תביעה?",
      answer: "הגשת תביעה פשוטה! העלו את המסמכים הרפואיים דרך האפליקציה, ונטפל בתביעה תוך 5 ימי עסקים.",
    },
  ];

  const dogBreeds = [
    { value: 'mixed', label: 'מעורב / לא ידוע', risk: 1.0 },
    { value: 'labrador', label: 'לברדור רטריבר', risk: 1.1 },
    { value: 'golden', label: 'גולדן רטריבר', risk: 1.1 },
    { value: 'german-shepherd', label: 'רועה גרמני', risk: 1.2 },
    { value: 'bulldog', label: 'בולדוג', risk: 1.4 },
    { value: 'poodle', label: 'פודל', risk: 1.0 },
    { value: 'husky', label: 'האסקי', risk: 1.15 },
  ];

  const catBreeds = [
    { value: 'mixed', label: 'מעורב / לא ידוע', risk: 1.0 },
    { value: 'persian', label: 'פרסי', risk: 1.3 },
    { value: 'siamese', label: 'סיאמי', risk: 1.1 },
    { value: 'maine-coon', label: 'מיין קון', risk: 1.15 },
    { value: 'british-shorthair', label: 'בריטי קצר שיער', risk: 1.1 },
  ];

  const currentBreeds = calculatorData.petType === 'dog' ? dogBreeds : catBreeds;

  const calculatePremium = () => {
    const basePremium = calculatorData.petType === 'dog' ? 79 : 59;
    let ageMultiplier = 1;
    
    if (calculatorData.petAge <= 2) ageMultiplier = 0.9;
    else if (calculatorData.petAge <= 5) ageMultiplier = 1;
    else if (calculatorData.petAge <= 8) ageMultiplier = 1.3;
    else if (calculatorData.petAge <= 12) ageMultiplier = 1.6;
    else ageMultiplier = 2;

    const selectedBreed = currentBreeds.find(b => b.value === calculatorData.breed);
    const breedRisk = selectedBreed?.risk || 1.0;
    const neuteredDiscount = calculatorData.isNeutered ? 0.95 : 1;
    
    const premium = Math.round(basePremium * ageMultiplier * breedRisk * neuteredDiscount);
    setCalculatedPremium(premium);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F7BF00', '#FF6B35', '#4ECDC4']
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-background" dir="rtl">
      <AppHeader 
        title="ביטוח חיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
      />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="px-4 mb-8"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                שומרה ביטוח
              </span>
            </div>

            <h1 className="text-2xl font-black text-foreground mb-2">
              הגנה מקיפה לחיית המחמד שלך 🐾
            </h1>
            
            <p className="text-muted-foreground text-sm mb-5">
              החזר הוצאות רפואיות במקרה של מחלה או תאונה
            </p>

            <div className="flex items-center gap-3">
              <div className="bg-background rounded-2xl px-4 py-3 shadow-sm">
                <div className="text-xs text-muted-foreground mb-0.5">החל מ-</div>
                <div className="text-2xl font-black text-primary">
                  ₪79
                  <span className="text-sm font-medium text-muted-foreground">/חודש</span>
                </div>
              </div>
              <Button 
                className="flex-1 rounded-2xl font-bold py-6"
                onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                צפה במסלולים
                <Sparkles className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Benefits */}
      <div className="px-4 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {keyBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="flex-shrink-0"
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${benefit.gradient} p-[2px]`}>
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-foreground" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-foreground">{benefit.title}</div>
                  <div className="text-[10px] text-muted-foreground">{benefit.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing-section">
        <Pricing
          icon={
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          }
          title="בחר את המסלול המתאים לך"
          subtitle="כל המסלולים כוללים כיסוי מקיף וטיפול מהיר בתביעות"
          tiers={pricingTiers}
          onTierSelect={handleTierSelect}
          footerTitle="צריך עזרה בבחירה?"
          footerDescription="נציגינו ישמחו לעזור לך לבחור את המסלול המתאים ביותר"
          footerButtonText="התקשרו אליי"
        />
      </div>

      {/* Coverage Categories */}
      <div className="px-4 py-8">
        <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          מה מכוסה?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {coverageCategories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card className="p-4 h-full border-0 shadow-md hover:shadow-lg transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-3`}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{category.title}</h3>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Calculator Section */}
      <div className="px-4 py-8">
        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-amber-50 via-background to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">מחשבון פרמיה</h2>
              <p className="text-xs text-muted-foreground">גלה כמה יעלה הביטוח לחיית המחמד שלך</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Pet Type */}
            <div>
              <Label className="font-bold text-foreground mb-3 block">סוג חיית מחמד</Label>
              <div className="flex gap-3">
                {[
                  { value: 'dog', label: '🐕 כלב' },
                  { value: 'cat', label: '🐈 חתול' }
                ].map((type) => (
                  <Button
                    key={type.value}
                    variant={calculatorData.petType === type.value ? "default" : "outline"}
                    className="flex-1 rounded-xl py-6"
                    onClick={() => setCalculatorData(prev => ({ ...prev, petType: type.value as 'dog' | 'cat', breed: '' }))}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Breed */}
            <div>
              <Label className="font-bold text-foreground mb-3 block">גזע</Label>
              <Select
                value={calculatorData.breed}
                onValueChange={(value) => setCalculatorData(prev => ({ ...prev, breed: value }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="בחר גזע" />
                </SelectTrigger>
                <SelectContent className="bg-popover border z-50">
                  {currentBreeds.map((breed) => (
                    <SelectItem key={breed.value} value={breed.value}>
                      {breed.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Age */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="font-bold text-foreground">גיל</Label>
                <span className="text-primary font-bold">{calculatorData.petAge} שנים</span>
              </div>
              <Slider
                value={[calculatorData.petAge]}
                onValueChange={(value) => setCalculatorData(prev => ({ ...prev, petAge: value[0] }))}
                min={0}
                max={15}
                step={1}
                className="py-4"
              />
            </div>

            {/* Neutered */}
            <div className="flex items-center justify-between p-4 bg-background rounded-xl">
              <Label className="font-medium text-foreground">מעוקר/מסורס?</Label>
              <Button
                variant={calculatorData.isNeutered ? "default" : "outline"}
                size="sm"
                onClick={() => setCalculatorData(prev => ({ ...prev, isNeutered: !prev.isNeutered }))}
              >
                {calculatorData.isNeutered ? "כן ✓" : "לא"}
              </Button>
            </div>

            {/* Calculate Button */}
            <Button 
              className="w-full rounded-2xl py-6 font-bold"
              onClick={calculatePremium}
            >
              חשב פרמיה
              <Sparkles className="w-4 h-4 mr-2" />
            </Button>

            {/* Result */}
            {calculatedPremium !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl"
              >
                <p className="text-sm text-muted-foreground mb-2">הפרמיה המשוערת שלך:</p>
                <div className="text-4xl font-black text-primary">
                  ₪{calculatedPremium}
                  <span className="text-lg font-medium text-muted-foreground">/חודש</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * המחיר הסופי עשוי להשתנות בהתאם לבדיקה רפואית
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-8">
        <h2 className="text-xl font-black text-foreground mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          שאלות נפוצות
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item) => (
            <AccordionItem 
              key={item.id} 
              value={item.id}
              className="border-0 bg-card rounded-2xl shadow-sm overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-4 hover:no-underline text-right font-bold text-foreground">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-muted-foreground text-sm">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Section */}
      <div className="px-4 py-8 mb-8">
        <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">צריך עזרה?</h2>
            <p className="text-muted-foreground text-sm mb-4">
              נציגינו זמינים לענות על כל שאלה
            </p>
            <Button className="rounded-2xl font-bold px-8">
              התקשרו אליי
              <Phone className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Insurance;
