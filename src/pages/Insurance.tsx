import { useState } from "react";
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
  TrendingUp
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
  const [claimFormData, setClaimFormData] = useState({
    petName: "",
    claimType: "",
    claimDate: "",
    claimAmount: "",
    description: "",
    vetName: "",
    vetContact: "",
  });

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
    { icon: MapPin, title: "כיסוי ארצי", desc: "כל הארץ", gradient: "from-emerald-400 to-teal-500" },
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
          </TabsContent>

          {/* Coverage Tab */}
          <TabsContent value="coverage" className="space-y-6">
            {/* What's Covered */}
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" />
                מה מכוסה?
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Stethoscope, title: "בדיקות ואבחון", desc: "בדיקות פיזיות, דיאגנוסטיות ומעבדה", gradient: "from-blue-400 to-indigo-500" },
                  { icon: Syringe, title: "הליכים רפואיים", desc: "ניתוחים והליכים כירורגיים", gradient: "from-emerald-400 to-teal-500" },
                  { icon: Pill, title: "תרופות", desc: "תרופות במרשם רופא וטרינר", gradient: "from-violet-400 to-purple-500" },
                  { icon: Activity, title: "פיזיותרפיה", desc: "עד 4 טיפולים בשנה", gradient: "from-orange-400 to-rose-500" },
                  { icon: Building2, title: "אשפוז", desc: "אשפוז בבית חולים וטרינרי", gradient: "from-pink-400 to-rose-500" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{item.title}</h4>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

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

      <BottomNav />
    </div>
  );
};

export default Insurance;
