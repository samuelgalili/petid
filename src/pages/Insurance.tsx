import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Check, 
  X, 
  Heart, 
  Activity, 
  Pill, 
  Syringe,
  FileText,
  Upload,
  Calendar,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Award,
  Building2,
  Phone,
  Mail,
  Clock,
  MapPin,
  Stethoscope,
  Home,
  Users,
  Info,
  AlertTriangle,
  Star,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

interface InsurancePlan {
  id: string;
  name: string;
  nameHe: string;
  price: string;
  priceValue: number;
  description: string;
  features: { name: string; included: boolean }[];
  color: string;
  iconBg: string;
  popular?: boolean;
  badge?: string;
}

const Insurance = () => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [shakeButton, setShakeButton] = useState(false);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    petType: 'dog' as 'dog' | 'cat',
    petAge: 1,
  });
  const [calculatedPremium, setCalculatedPremium] = useState<number | null>(null);
  const [claimFormData, setClaimFormData] = useState({
    petName: "",
    claimType: "",
    claimDate: "",
    claimAmount: "",
    description: "",
    vetName: "",
    vetContact: "",
  });

  // Scroll listener for floating CTA
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowFloatingCTA(scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const insurancePlans: InsurancePlan[] = [
    {
      id: "track1",
      name: "מסלול 1",
      nameHe: "מקיף",
      price: "₪149",
      priceValue: 149,
      description: "כיסוי מלא למחלות ותאונות",
      color: "from-amber-400 via-yellow-400 to-orange-400",
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
      popular: true,
      badge: "הכי פופולרי",
      features: [
        { name: "כיסוי תאונות", included: true },
        { name: "כיסוי מחלות", included: true },
        { name: "ניתוחים והליכים רפואיים", included: true },
        { name: "בדיקות דיאגנוסטיות", included: true },
        { name: "תרופות במרשם", included: true },
        { name: "פיזיותרפיה/הידרותרפיה", included: true },
        { name: "מזון רפואי (14 יום)", included: true },
        { name: "אשפוז בבית חולים", included: true },
      ],
    },
    {
      id: "track2",
      name: "מסלול 2",
      nameHe: "תאונות",
      price: "₪79",
      priceValue: 79,
      description: "כיסוי לתאונות בלבד",
      color: "from-blue-400 via-indigo-400 to-purple-400",
      iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500",
      features: [
        { name: "כיסוי תאונות", included: true },
        { name: "כיסוי מחלות", included: false },
        { name: "ניתוחים בעקבות תאונה", included: true },
        { name: "בדיקות דיאגנוסטיות", included: true },
        { name: "תרופות במרשם", included: true },
        { name: "פיזיותרפיה (עד 4 טיפולים)", included: true },
        { name: "מזון רפואי", included: false },
        { name: "כיסוי עד 90 יום לתאונה", included: true },
      ],
    },
  ];

  // Coverage Categories - Chayuta Style
  const coverageCategories = [
    {
      icon: AlertCircle,
      title: "תאונות ופציעות",
      description: "נשיכות, קריעת רצועות, הכשת נחש, תאונות דרכים",
      gradient: "from-rose-400 to-red-500",
      items: ["נשיכות וקרעים", "שברים ונקעים", "הכשות נחשים", "תאונות דרכים", "פציעות ספורט"],
    },
    {
      icon: Activity,
      title: "מחלות",
      description: "בדיקות, ביופסיה, הדמיות - מאבחון עד החלמה",
      gradient: "from-blue-400 to-indigo-500",
      items: ["זיהומים בקטריאליים", "מחלות ויראליות", "דלקות", "הרעלות", "מחלות פנימיות"],
    },
    {
      icon: Heart,
      title: "מצבים כרוניים",
      description: "אלרגיות, סוכרת, כשל כלייתי, מצבי לב",
      gradient: "from-purple-400 to-violet-500",
      items: ["אלרגיות ואטופיה", "סוכרת", "כשל כלייתי", "מחלות לב", "אפילפסיה"],
    },
    {
      icon: Star,
      title: "מצבים גנטיים",
      description: "מחלות אופייניות לגזע ומצבים תורשתיים",
      gradient: "from-amber-400 to-orange-500",
      items: ["דיספלזיה", "מחלות עיניים תורשתיות", "בעיות עמוד שדרה", "מחלות לב גנטיות"],
    },
  ];

  // Medical Procedures Covered - Chayuta Style
  const medicalProcedures = [
    { icon: Activity, title: "בדיקות דם", desc: "פאנל דם מלא, נוגדנים, תפקודי כבד וכליות", gradient: "from-red-400 to-rose-500" },
    { icon: Stethoscope, title: "בדיקות מעבדה", desc: "תרביות, פתולוגיה, בדיקות גללים", gradient: "from-emerald-400 to-teal-500" },
    { icon: TrendingUp, title: "בדיקות הדמיה", desc: "MRI, CT, אולטרסאונד, צילומי רנטגן", gradient: "from-blue-400 to-indigo-500" },
    { icon: Syringe, title: "ניתוחים", desc: "אבנים בכליות, היפוך קיבה, ניתוחי חירום", gradient: "from-violet-400 to-purple-500" },
    { icon: Building2, title: "אשפוזים", desc: "ימי אשפוז כולל עירויים ותרופות", gradient: "from-pink-400 to-rose-500" },
    { icon: Users, title: "רפואה מתמחה", desc: "מומחים בקרדיולוגיה, נוירולוגיה, אורתופדיה", gradient: "from-cyan-400 to-sky-500" },
    { icon: Sparkles, title: "טיפולי סרטן", desc: "כימותרפיה והליכים חדשניים", gradient: "from-fuchsia-400 to-pink-500" },
    { icon: Pill, title: "תרופות במרשם", desc: "כל התרופות שנרשמו ע״י וטרינר", gradient: "from-orange-400 to-amber-500" },
  ];

  // Special Add-ons - Chayuta Style
  const specialAddons = [
    {
      icon: Home,
      title: "קצבה בפנסיון",
      description: "עד ₪420 כיסוי הוצאות פנסיון כשהבעלים מאושפז או נולד ילד חדש",
      gradient: "from-emerald-400 to-teal-500",
      amount: "₪420",
    },
    {
      icon: MapPin,
      title: "ביקורי בית",
      description: "ביקור וטרינר בבית לחיות קשישות או עם חרדה מנסיעות",
      gradient: "from-blue-400 to-indigo-500",
      amount: "כלול",
    },
    {
      icon: TrendingUp,
      title: "כיסוי בחו״ל",
      description: "כיסוי טיפולים וטרינריים בחו״ל עד 4,000 ש״ח בשנה",
      gradient: "from-violet-400 to-purple-500",
      amount: "₪4,000",
    },
    {
      icon: Heart,
      title: "טיפול התנהגותי",
      description: "מימון טיפולים התנהגותיים לבעיות חרדה ואגרסיביות",
      gradient: "from-pink-400 to-rose-500",
      amount: "כלול",
    },
    {
      icon: Pill,
      title: "מזון רפואי",
      description: "עד 14 יום מזון רפואי במרשם לאחר טיפול",
      gradient: "from-amber-400 to-orange-500",
      amount: "14 יום",
    },
    {
      icon: Activity,
      title: "טיפולי שיניים",
      description: "כיסוי טיפולי שיניים כתוצאה מתאונה בלבד",
      gradient: "from-cyan-400 to-sky-500",
      amount: "מתאונה",
    },
  ];

  const additionalCoverages = [
    {
      icon: Home,
      title: "שהות בפנסיון",
      description: "כיסוי הוצאות הלנה והזנה בפנסיון כאשר הבעלים מאושפז",
      included: "כלול",
      gradient: "from-emerald-400 to-teal-500",
    },
    {
      icon: Users,
      title: "אחריות צד שלישי",
      description: "כיסוי נזקים שגרמה חיית המחמד לצד שלישי",
      included: "בתוספת",
      gradient: "from-violet-400 to-purple-500",
    },
  ];

  const keyBenefits = [
    { icon: ShieldCheck, title: "כיסוי מקיף", desc: "מחלות ותאונות", gradient: "from-amber-400 to-orange-500" },
    { icon: Clock, title: "תקופת אכשרה", desc: "45 יום", gradient: "from-blue-400 to-indigo-500" },
    { icon: Award, title: "תקרה שנתית", desc: "₪30,000", gradient: "from-emerald-400 to-teal-500" },
    { icon: Calendar, title: "תקופת ביטוח", desc: "עד 5 שנים", gradient: "from-pink-400 to-rose-500" },
  ];

  const exclusions = [
    {
      id: "vaccines",
      title: "חיסונים וטיפולים מונעים",
      icon: Syringe,
      items: ["חיסונים שגרתיים", "טיפול מונע לתולעים ופרעושים", "טיפולים אלקטיביים וקוסמטיים"],
    },
    {
      id: "dental",
      title: "טיפולי שיניים",
      icon: Activity,
      items: ["טיפולי שיניים וחניכיים שאינם תוצאה של תאונה", "ניקוי שיניים שגרתי"],
    },
    {
      id: "preexisting",
      title: "מצבים קודמים",
      icon: FileText,
      items: ["מחלות שאובחנו לפני תחילת הביטוח", "מומים מולדים", "בעיות גנטיות"],
    },
    {
      id: "breeding",
      title: "הריון והמלטה",
      icon: Heart,
      items: ["הריון והמלטה", "ניתוח קיסרי", "עיקור וסירוס (למעט בהוראת וטרינר)"],
    },
  ];

  // Premium calculator function
  const calculatePremium = () => {
    const basePremium = calculatorData.petType === 'dog' ? 79 : 59;
    let ageMultiplier = 1;
    
    if (calculatorData.petAge <= 2) {
      ageMultiplier = 0.9;
    } else if (calculatorData.petAge <= 5) {
      ageMultiplier = 1;
    } else if (calculatorData.petAge <= 8) {
      ageMultiplier = 1.3;
    } else if (calculatorData.petAge <= 12) {
      ageMultiplier = 1.6;
    } else {
      ageMultiplier = 2;
    }
    
    const premium = Math.round(basePremium * ageMultiplier);
    setCalculatedPremium(premium);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['petName', 'claimType', 'claimDate', 'claimAmount'];
    const emptyFields = requiredFields.filter(field => !claimFormData[field as keyof typeof claimFormData]);
    
    if (emptyFields.length > 0) {
      // Trigger shake animation
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 500);
      
      toast({
        title: "יש למלא את כל השדות הנדרשים",
        description: "אנא מלא את חיית המחמד, סוג התביעה, תאריך וסכום.",
        variant: "destructive",
      });
      return;
    }
    
    // Trigger confetti celebration
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#F7BF00', '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    // Also fire a burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors
    });

    toast({
      title: "התביעה הוגשה בהצלחה! 🎉",
      description: "נחזור אליך תוך 2-3 ימי עסקים.",
    });

    setClaimFormData({
      petName: "",
      claimType: "",
      claimDate: "",
      claimAmount: "",
      description: "",
      vetName: "",
      vetContact: "",
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      <AppHeader 
        title="ביטוח חיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
      />

      {/* Hero Section - Instagram Stories Style */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="px-4 -mt-2 mb-6"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-[2px]">
          <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-[22px] p-6 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-amber-300/40 to-transparent rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-orange-300/40 to-transparent rounded-full blur-2xl translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-full">
                  שומרה ביטוח
                </span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-black text-gray-900 mb-2"
              >
                הגנה מקיפה לחיית המחמד שלך 🐾
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 text-sm mb-5 leading-relaxed"
              >
                החזר הוצאות רפואיות במקרה של מחלה או תאונה
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-0.5">החל מ-</div>
                  <div className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    ₪79
                    <span className="text-sm font-medium text-gray-400">/חודש</span>
                  </div>
                </div>
                <Button 
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold py-6 shadow-lg shadow-orange-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-300/50 hover:-translate-y-0.5"
                  onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  צפה במסלולים
                  <Sparkles className="w-4 h-4 mr-2" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Benefits - Instagram Highlights Style */}
      <div className="px-4 mb-6">
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
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-900">{benefit.title}</div>
                  <div className="text-[10px] text-gray-500">{benefit.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs - Instagram Style */}
      <div className="px-4">
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6">
            {[
              { value: "plans", label: "מסלולים" },
              { value: "coverage", label: "כיסויים" },
              { value: "claims", label: "תביעות" },
              { value: "info", label: "מידע" },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="rounded-xl text-xs font-bold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-400 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-5" id="plans-section">
            {/* Insurance Plans - Instagram Card Style */}
            <div className="space-y-4">
              {insurancePlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.15, type: "spring", stiffness: 100 }}
                >
                  <Card className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${plan.popular ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                    {plan.badge && (
                      <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="absolute top-4 left-4 z-10"
                      >
                        <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg shadow-orange-200/50">
                          <Star className="w-3 h-3 fill-current" />
                          {plan.badge}
                        </span>
                      </motion.div>
                    )}
                    
                    {/* Card Header */}
                    <div className={`bg-gradient-to-r ${plan.color} p-5 pt-8`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white/80 text-xs font-medium mb-1">{plan.name}</div>
                          <h3 className="text-2xl font-black text-white mb-1">{plan.nameHe}</h3>
                          <p className="text-white/90 text-sm">{plan.description}</p>
                        </div>
                        <div className="text-left bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                          <div className="text-3xl font-black text-white">{plan.price}</div>
                          <div className="text-xs text-white/80">לחודש</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 bg-white">
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {plan.features.map((feature, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            {feature.included ? (
                              <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Check className="w-3 h-3 text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <X className="w-3 h-3 text-gray-400" strokeWidth={3} />
                              </div>
                            )}
                            <span className={`text-xs ${feature.included ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                              {feature.name}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className={`w-full bg-gradient-to-r ${plan.color} text-white rounded-2xl font-bold py-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            בחר מסלול
                            <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl max-w-[90vw] border-0 shadow-2xl" dir="rtl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black text-gray-900">
                              הצטרפות ל{plan.name} - {plan.nameHe}
                            </DialogTitle>
                            <DialogDescription className="text-gray-500">
                              מלא את הפרטים להצטרפות לביטוח
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="font-bold text-gray-700">בחר חיית מחמד</Label>
                              <Select>
                                <SelectTrigger className="mt-2 rounded-xl border-gray-200">
                                  <SelectValue placeholder="בחר חיית מחמד" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pet1">מקס (כלב) 🐕</SelectItem>
                                  <SelectItem value="pet2">לונה (חתולה) 🐈</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-amber-800 mb-1">תקופת אכשרה</p>
                                  <p className="text-xs text-amber-700">
                                    • כיסוי תאונות: 72 שעות<br/>
                                    • כיסוי מחלות: 45 יום
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Button
                              className={`w-full bg-gradient-to-r ${plan.color} text-white rounded-2xl font-bold py-6 shadow-lg hover:shadow-xl transition-all`}
                              onClick={() => {
                                // Trigger celebration confetti
                                const colors = ['#F7BF00', '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'];
                                confetti({
                                  particleCount: 100,
                                  spread: 70,
                                  origin: { y: 0.6 },
                                  colors: colors
                                });
                                // Side confetti
                                confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors });
                                confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors });
                                
                                toast({
                                  title: "הבקשה נשלחה! 🎉",
                                  description: "נציג יצור איתך קשר בהקדם.",
                                });
                              }}
                            >
                              שלח בקשה להצטרפות
                              <Zap className="w-5 h-5 mr-2" />
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Additional Coverages */}
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                כיסויים נוספים
              </h2>
              <div className="space-y-3">
                {additionalCoverages.map((coverage, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 bg-gradient-to-br ${coverage.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <coverage.icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-0.5">{coverage.title}</h3>
                          <p className="text-xs text-gray-500 mb-2">{coverage.description}</p>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${coverage.gradient} text-white`}>
                            {coverage.included}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Premium Calculator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-amber-50 via-white to-orange-50">
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-500" />
                  מחשבון פרמיה
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  חשב את הפרמיה המשוערת לפי סוג וגיל חיית המחמד שלך
                </p>
                
                <div className="space-y-6">
                  {/* Pet Type Selection */}
                  <div>
                    <Label className="text-sm font-bold text-gray-700 mb-3 block">
                      סוג חיית מחמד
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCalculatorData(prev => ({ ...prev, petType: 'dog' }))}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center gap-3 ${
                          calculatorData.petType === 'dog'
                            ? 'border-amber-400 bg-amber-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">🐕</span>
                        <span className="font-bold text-gray-900">כלב</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCalculatorData(prev => ({ ...prev, petType: 'cat' }))}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center gap-3 ${
                          calculatorData.petType === 'cat'
                            ? 'border-amber-400 bg-amber-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">🐈</span>
                        <span className="font-bold text-gray-900">חתול</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Age Slider */}
                  <div>
                    <Label className="text-sm font-bold text-gray-700 mb-3 block">
                      גיל: <span className="text-amber-600">{calculatorData.petAge} שנים</span>
                    </Label>
                    <Slider
                      value={[calculatorData.petAge]}
                      onValueChange={(value) => setCalculatorData(prev => ({ ...prev, petAge: value[0] }))}
                      max={15}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>1 שנה</span>
                      <span>15 שנים</span>
                    </div>
                  </div>

                  {/* Calculate Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={calculatePremium}
                      className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-bold py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Calculator className="w-5 h-5 ml-2" />
                      חשב פרמיה
                    </Button>
                  </motion.div>

                  {/* Result */}
                  <AnimatePresence>
                    {calculatedPremium !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="p-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-xl text-white text-center"
                      >
                        <p className="text-sm opacity-90 mb-2">הפרמיה המשוערת שלך</p>
                        <motion.p
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.2 }}
                          className="text-4xl font-black mb-2"
                        >
                          ₪{calculatedPremium}
                        </motion.p>
                        <p className="text-xs opacity-80">לחודש</p>
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <p className="text-xs opacity-70">
                            * המחיר הסופי עשוי להשתנות בהתאם לבדיקות רפואיות ותנאי הפוליסה
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Coverage Tab */}
          <TabsContent value="coverage" className="space-y-6">
            {/* Coverage Categories - Chayuta Bubbles Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                אם אחד מהתרחישים הללו יקרה...
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                כיסוי מלא מזנב ועד ראש 🐾
              </p>
              <div className="grid grid-cols-2 gap-3">
                {coverageCategories.map((category, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                  >
                    <Card className="p-4 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full group">
                      <motion.div 
                        className={`w-14 h-14 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center mb-3 shadow-lg`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <category.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <h4 className="font-black text-gray-900 text-sm mb-1">{category.title}</h4>
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{category.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {category.items.slice(0, 3).map((item, idx) => (
                          <motion.span 
                            key={idx} 
                            className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 + idx * 0.05 + 0.3 }}
                          >
                            {item}
                          </motion.span>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Medical Procedures - Instagram Grid Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                מה מכוסה?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                הביטוח ישלם את החשבונות הווטרינריים שלכם
              </p>
              <div className="grid grid-cols-2 gap-3">
                {medicalProcedures.map((proc, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ 
                      delay: index * 0.08,
                      type: "spring",
                      stiffness: 100
                    }}
                  >
                    <Card className="p-3 border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-start gap-3">
                        <motion.div 
                          className={`w-10 h-10 bg-gradient-to-br ${proc.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
                          whileHover={{ scale: 1.15, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <proc.icon className="w-5 h-5 text-white" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-xs mb-0.5">{proc.title}</h4>
                          <p className="text-[10px] text-gray-500 leading-tight">{proc.desc}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Special Add-ons - Chayuta Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                תוספות מיוחדות
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                הטבות נוספות שרק אצלנו
              </p>
              <div className="space-y-3">
                {specialAddons.map((addon, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -50, scale: 0.95 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 80,
                      damping: 15
                    }}
                  >
                    <Card className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
                      <motion.div 
                        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${addon.gradient} opacity-10 rounded-full blur-2xl`}
                        animate={{ 
                          x: [8, 16, 8],
                          y: [-8, -16, -8],
                        }}
                        transition={{ 
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <div className="flex items-center gap-4 relative z-10">
                        <motion.div 
                          className={`w-12 h-12 bg-gradient-to-br ${addon.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}
                          whileHover={{ scale: 1.1, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <addon.icon className="w-6 h-6 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm mb-0.5">{addon.title}</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">{addon.description}</p>
                        </div>
                        <motion.div 
                          className={`bg-gradient-to-br ${addon.gradient} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {addon.amount}
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Exclusions */}
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                חריגים
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {exclusions.map((exclusion) => (
                  <AccordionItem key={exclusion.id} value={exclusion.id} className="border-0">
                    <Card className="overflow-hidden border-0 shadow-sm">
                      <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                            <exclusion.icon className="w-4 h-4 text-rose-500" />
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{exclusion.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <ul className="space-y-2 mr-11">
                          {exclusion.items.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Comparison Table - Chayuta Style with Progress Bars */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                טבלת השוואת מסלולים
              </h2>
              
              {/* Coverage Progress Overview */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-4 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">מסלול 1</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">כיסוי מלא</p>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">כיסוי</span>
                      <motion.span
                        className="text-xs font-bold text-amber-600"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.5 }}
                      >
                        100%
                      </motion.span>
                    </div>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="p-4 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">מסלול 2</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">תאונות בלבד</p>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: "64%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">כיסוי</span>
                      <motion.span
                        className="text-xs font-bold text-blue-600"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.6 }}
                      >
                        64%
                      </motion.span>
                    </div>
                  </Card>
                </motion.div>
              </div>

              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="grid grid-cols-3 gap-0">
                  {/* Header */}
                  <motion.div 
                    className="bg-gray-50 p-3 border-b border-gray-100"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-xs font-bold text-gray-500">כיסויים</span>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-r from-amber-400 to-orange-400 p-3 border-b border-amber-300 text-center"
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <span className="text-xs font-black text-white">מסלול 1</span>
                    <div className="text-[10px] text-white/80">תאונות + מחלות</div>
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-r from-blue-400 to-indigo-400 p-3 border-b border-blue-300 text-center"
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <span className="text-xs font-black text-white">מסלול 2</span>
                    <div className="text-[10px] text-white/80">תאונות בלבד</div>
                  </motion.div>

                  {/* Rows with Progress Animation */}
                  {[
                    { feature: "תאונות ופציעות", plan1: true, plan2: true },
                    { feature: "מחלות", plan1: true, plan2: false },
                    { feature: "מצבים כרוניים", plan1: true, plan2: false },
                    { feature: "מצבים גנטיים", plan1: true, plan2: false },
                    { feature: "ניתוחים", plan1: true, plan2: true },
                    { feature: "אשפוזים", plan1: true, plan2: true },
                    { feature: "בדיקות הדמיה", plan1: true, plan2: true },
                    { feature: "תרופות במרשם", plan1: true, plan2: true },
                    { feature: "פיזיותרפיה", plan1: true, plan2: true },
                    { feature: "תקרה שנתית", plan1: "₪30,000", plan2: "₪30,000" },
                    { feature: "השתתפות עצמית", plan1: "₪250-500", plan2: "₪250-500" },
                  ].map((row, idx) => (
                    <React.Fragment key={idx}>
                      <motion.div 
                        className={`p-3 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 + 0.4 }}
                      >
                        <span className="text-xs font-medium text-gray-700">{row.feature}</span>
                      </motion.div>
                      <motion.div 
                        className={`p-3 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} flex items-center justify-center`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 + 0.5, type: "spring", stiffness: 200 }}
                      >
                        {typeof row.plan1 === 'boolean' ? (
                          row.plan1 ? (
                            <motion.div 
                              className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"
                              whileHover={{ scale: 1.2 }}
                              initial={{ rotate: -180, opacity: 0 }}
                              whileInView={{ rotate: 0, opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.05 + 0.6, type: "spring" }}
                            >
                              <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                            </motion.div>
                          ) : (
                            <motion.div 
                              className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.05 + 0.6 }}
                            >
                              <X className="w-4 h-4 text-gray-400" strokeWidth={3} />
                            </motion.div>
                          )
                        ) : (
                          <motion.span 
                            className="text-xs font-bold text-amber-600"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 + 0.6 }}
                          >
                            {row.plan1}
                          </motion.span>
                        )}
                      </motion.div>
                      <motion.div 
                        className={`p-3 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} flex items-center justify-center`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 + 0.55, type: "spring", stiffness: 200 }}
                      >
                        {typeof row.plan2 === 'boolean' ? (
                          row.plan2 ? (
                            <motion.div 
                              className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"
                              whileHover={{ scale: 1.2 }}
                              initial={{ rotate: -180, opacity: 0 }}
                              whileInView={{ rotate: 0, opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.05 + 0.65, type: "spring" }}
                            >
                              <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                            </motion.div>
                          ) : (
                            <motion.div 
                              className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.05 + 0.65 }}
                            >
                              <X className="w-4 h-4 text-gray-400" strokeWidth={3} />
                            </motion.div>
                          )
                        ) : (
                          <motion.span 
                            className="text-xs font-bold text-blue-600"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 + 0.65 }}
                          >
                            {row.plan2}
                          </motion.span>
                        )}
                      </motion.div>
                    </React.Fragment>
                  ))}
                </div>
                
                {/* Bottom Progress Summary */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">מסלול 1 - מקיף</span>
                        <span className="text-xs font-bold text-amber-600">9/9</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 1.2 }}
                        />
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.1 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">מסלול 2 - תאונות</span>
                        <span className="text-xs font-bold text-blue-600">6/9</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "66.7%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 1.3 }}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Important Notes */}
            <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-md">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-500" />
                הערות חשובות
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  "תקופת אכשרה של 45 יום למחלות (לא חלה על תאונות)",
                  "כיסוי תאונות נכנס לתוקף 72 שעות מתחילת הביטוח",
                  "חובה על חיסונים עדכניים לפי הנחיות הפוליסה",
                  "טיפול נגד תולעת הפארק אחת ל-3 חודשים",
                ].map((note, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 flex-shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                הגשת תביעה
              </h2>
              <Card className="p-6 border-0 shadow-lg">
                <form onSubmit={handleClaimSubmit} className="space-y-5">
                  <div>
                    <Label className="font-bold text-gray-700">חיית מחמד</Label>
                    <Select
                      value={claimFormData.petName}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, petName: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl border-gray-200 h-12">
                        <SelectValue placeholder="בחר חיית מחמד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max">מקס (כלב) 🐕</SelectItem>
                        <SelectItem value="luna">לונה (חתולה) 🐈</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-bold text-gray-700">סוג התביעה</Label>
                    <Select
                      value={claimFormData.claimType}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, claimType: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl border-gray-200 h-12">
                        <SelectValue placeholder="בחר סוג תביעה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accident">תאונה</SelectItem>
                        <SelectItem value="illness">מחלה</SelectItem>
                        <SelectItem value="surgery">ניתוח</SelectItem>
                        <SelectItem value="hospitalization">אשפוז</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-bold text-gray-700">תאריך הטיפול</Label>
                      <Input
                        type="date"
                        value={claimFormData.claimDate}
                        onChange={(e) => setClaimFormData({ ...claimFormData, claimDate: e.target.value })}
                        className="mt-2 rounded-xl border-gray-200 h-12"
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-gray-700">סכום (₪)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={claimFormData.claimAmount}
                        onChange={(e) => setClaimFormData({ ...claimFormData, claimAmount: e.target.value })}
                        className="mt-2 rounded-xl border-gray-200 h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-gray-700">שם המרפאה/וטרינר</Label>
                    <Input
                      type="text"
                      placeholder="שם המרפאה הווטרינרית"
                      value={claimFormData.vetName}
                      onChange={(e) => setClaimFormData({ ...claimFormData, vetName: e.target.value })}
                      className="mt-2 rounded-xl border-gray-200 h-12"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-gray-700">תיאור המקרה</Label>
                    <Textarea
                      placeholder="תאר את נסיבות המקרה והטיפול שניתן..."
                      value={claimFormData.description}
                      onChange={(e) => setClaimFormData({ ...claimFormData, description: e.target.value })}
                      className="mt-2 rounded-xl border-gray-200 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-gray-700 mb-2 block">העלאת מסמכים</Label>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-amber-400 transition-all duration-300 cursor-pointer bg-gray-50 hover:bg-amber-50 group">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-amber-500 transition-colors" />
                      <p className="text-sm text-gray-600 font-medium">
                        לחץ להעלאת מסמכים
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (עד 10MB)</p>
                    </div>
                  </div>

                  <motion.div
                    animate={shakeButton ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <Button
                      type="submit"
                      className={`w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-bold py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${shakeButton ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}
                    >
                      הגש תביעה
                      <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                    </Button>
                  </motion.div>
                </form>
              </Card>
            </motion.div>

            {/* Recent Claims */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                תביעות אחרונות
              </h3>
              <div className="space-y-3">
                {[
                  { pet: "מקס", emoji: "🐕", type: "טיפול חירום", amount: "₪850", status: "אושר", statusBg: "bg-emerald-100", statusColor: "text-emerald-700", date: "15.01.2025" },
                  { pet: "לונה", emoji: "🐈", type: "בדיקות", amount: "₪320", status: "בטיפול", statusBg: "bg-amber-100", statusColor: "text-amber-700", date: "10.01.2025" },
                ].map((claim, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                          {claim.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900">{claim.pet}</h4>
                            <span className="text-xs text-gray-500">• {claim.type}</span>
                          </div>
                          <p className="text-xs text-gray-400">{claim.date}</p>
                        </div>
                        <div className="text-left">
                          <div className="text-lg font-black text-gray-900 mb-1">{claim.amount}</div>
                          <div className={`text-xs font-bold px-3 py-1 rounded-full ${claim.statusBg} ${claim.statusColor}`}>
                            {claim.status}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-5">
            {/* About the Policy */}
            <Card className="p-5 border-0 shadow-md">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                אודות הפוליסה
              </h2>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                פוליסה זו מספקת כיסוי להחזר הוצאות רפואיות עבור כלבים וחתולים בלבד, 
                השייכים למבוטח והמצויים באחריותו ובהשגחתו בגבולות מדינת ישראל.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
                  <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                  <div className="text-xs text-gray-500">תקופת ביטוח</div>
                  <div className="font-bold text-gray-900">עד 5 שנים</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
                  <Clock className="w-5 h-5 text-amber-500 mb-2" />
                  <div className="text-xs text-gray-500">תקופת אכשרה</div>
                  <div className="font-bold text-gray-900">45 יום</div>
                </div>
              </div>
            </Card>

            {/* Identification Requirements */}
            <Card className="p-5 border-0 shadow-md">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-500" />
                דרישות זיהוי
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    🐕
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">כלב</div>
                    <p className="text-xs text-gray-500">חובת סימון בשבב אלקטרוני</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    🐈
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">חתול</div>
                    <p className="text-xs text-gray-500">צילום דיגיטלי עדכני</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact */}
            <Card className="p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-0 shadow-md">
              <h3 className="font-bold text-gray-900 mb-4">צריכים עזרה? 💬</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">טלפון</div>
                    <div className="text-sm text-gray-500">*6050</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">אימייל</div>
                    <div className="text-sm text-gray-500">sherut@shomera.co.il</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Insurance Provider */}
            <Card className="p-5 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="font-black text-gray-900">שומרה חברה לביטוח בע"מ</div>
                  <p className="text-xs text-gray-500">הסיבים 23, פתח תקווה</p>
                  <p className="text-xs text-gray-500">מיקוד 4959381</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating CTA Button */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-4 right-4 z-50"
          >
            <motion.button
              onClick={() => {
                toast({
                  title: "מצוין! 🎉",
                  description: "נציג יצור איתך קשר בהקדם לקבלת הצעת מחיר",
                });
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.9 }
                });
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-white font-black text-lg rounded-2xl shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-200%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <ShieldCheck className="w-6 h-6" />
              <span className="relative z-10">קבל הצעת מחיר עכשיו</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Insurance;
