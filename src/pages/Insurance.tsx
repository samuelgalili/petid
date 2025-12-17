import { useState } from "react";
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
  DollarSign,
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
  Sparkles
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
  description: string;
  features: { name: string; included: boolean }[];
  color: string;
  popular?: boolean;
  badge?: string;
}

const Insurance = () => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedExclusion, setExpandedExclusion] = useState<string | null>(null);
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
      name: "Track 1",
      nameHe: "מסלול 1 - מקיף",
      price: "₪149",
      description: "כיסוי מלא למחלות ותאונות",
      color: "from-[#F7BF00] to-[#E3A700]",
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
      name: "Track 2",
      nameHe: "מסלול 2 - תאונות",
      price: "₪79",
      description: "כיסוי לתאונות בלבד",
      color: "from-[#3E8DFB] to-[#1D4E89]",
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
      description: "כיסוי הוצאות הלנה והזנה בפנסיון כאשר הבעלים מאושפז או מרותק למיטה",
      included: "כלול בכל המסלולים",
    },
    {
      icon: Users,
      title: "אחריות צד שלישי",
      description: "כיסוי נזקים שגרמה חיית המחמד לצד שלישי (גוף או רכוש)",
      included: "בתוספת תשלום",
    },
  ];

  const keyBenefits = [
    { icon: ShieldCheck, title: "כיסוי מקיף", desc: "מחלות ותאונות" },
    { icon: Clock, title: "תקופת אכשרה", desc: "45 יום למחלות" },
    { icon: MapPin, title: "כיסוי ארצי", desc: "בכל רחבי ישראל" },
    { icon: Calendar, title: "תקופת ביטוח", desc: "עד 5 שנים" },
  ];

  const exclusions = [
    {
      id: "vaccines",
      title: "חיסונים וטיפולים מונעים",
      items: ["חיסונים שגרתיים", "טיפול מונע לתולעים ופרעושים", "טיפולים אלקטיביים וקוסמטיים"],
    },
    {
      id: "dental",
      title: "טיפולי שיניים",
      items: ["טיפולי שיניים וחניכיים שאינם תוצאה של תאונה", "ניקוי שיניים שגרתי"],
    },
    {
      id: "preexisting",
      title: "מצבים קודמים",
      items: ["מחלות שאובחנו לפני תחילת הביטוח", "מומים מולדים", "בעיות גנטיות"],
    },
    {
      id: "breeding",
      title: "הריון והמלטה",
      items: ["הריון והמלטה", "ניתוח קיסרי", "עיקור וסירוס (למעט בהוראת וטרינר)"],
    },
    {
      id: "behavior",
      title: "בעיות התנהגות",
      items: ["טיפולים התנהגותיים", "אילוף", "בעיות התנהגות מכל סוג"],
    },
  ];

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "התביעה הוגשה בהצלחה!",
      description: "התביעה שלך נמצאת בבדיקה. ניצור קשר תוך 2-3 ימי עסקים.",
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
    <div className="min-h-screen pb-20 bg-[#F6F6F6]" dir="rtl">
      <AppHeader 
        title="ביטוח חיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={{
          icon: ShieldCheck,
          onClick: () => {}
        }}
      />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 -mt-4 mb-6"
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-[#F7BF00] via-[#F9C600] to-[#E3A700] p-6 text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-4 left-4 w-20 h-20 bg-white rounded-full blur-2xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">שומרה ביטוח</span>
              </div>
              <h1 className="text-2xl font-black mb-2 text-[#2F2F2F]">ביטוח רפואי לחיות מחמד</h1>
              <p className="text-[#2F2F2F]/80 text-sm mb-4">
                הגנה מקיפה לכלבים וחתולים - החזר הוצאות רפואיות במקרה של מחלה או תאונה
              </p>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="text-xs text-[#2F2F2F]/70">החל מ-</div>
                  <div className="text-xl font-black text-[#2F2F2F]">₪79/חודש</div>
                </div>
                <Button 
                  className="bg-[#2F2F2F] hover:bg-[#2F2F2F]/90 text-white rounded-full font-bold px-6"
                  onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  לפרטים נוספים
                  <ChevronDown className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Key Benefits */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {keyBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-white rounded-2xl p-3 text-center shadow-sm"
            >
              <div className="w-10 h-10 bg-[#F7BF00]/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <benefit.icon className="w-5 h-5 text-[#F7BF00]" />
              </div>
              <div className="text-xs font-bold text-[#2F2F2F]">{benefit.title}</div>
              <div className="text-[10px] text-[#767676]">{benefit.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white rounded-2xl p-1.5 shadow-sm mb-6">
            <TabsTrigger 
              value="plans" 
              className="rounded-xl text-xs font-bold data-[state=active]:bg-[#F7BF00] data-[state=active]:text-[#2F2F2F]"
            >
              מסלולים
            </TabsTrigger>
            <TabsTrigger 
              value="coverage" 
              className="rounded-xl text-xs font-bold data-[state=active]:bg-[#F7BF00] data-[state=active]:text-[#2F2F2F]"
            >
              כיסויים
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="rounded-xl text-xs font-bold data-[state=active]:bg-[#F7BF00] data-[state=active]:text-[#2F2F2F]"
            >
              תביעות
            </TabsTrigger>
            <TabsTrigger 
              value="info" 
              className="rounded-xl text-xs font-bold data-[state=active]:bg-[#F7BF00] data-[state=active]:text-[#2F2F2F]"
            >
              מידע
            </TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6" id="plans-section">
            {/* Insurance Plans */}
            <div className="space-y-4">
              {insurancePlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card className={`relative overflow-hidden ${plan.popular ? 'ring-2 ring-[#F7BF00]' : ''}`}>
                    {plan.badge && (
                      <div className="absolute top-0 right-0 bg-[#F7BF00] text-[#2F2F2F] text-xs font-black px-4 py-1.5 rounded-bl-2xl flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {plan.badge}
                      </div>
                    )}
                    <div className="p-5 pt-8">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-black text-[#2F2F2F] mb-1">{plan.nameHe}</h3>
                          <p className="text-sm text-[#767676]">{plan.description}</p>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-black text-[#2F2F2F]">{plan.price}</div>
                          <div className="text-xs text-[#767676]">לחודש</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {feature.included ? (
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <X className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                            <span className={`text-xs ${feature.included ? 'text-[#2F2F2F]' : 'text-[#767676]'}`}>
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className={`w-full bg-gradient-to-l ${plan.color} text-white rounded-full font-bold py-6 shadow-lg hover:shadow-xl transition-all`}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            בחר מסלול
                            <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl max-w-[90vw]" dir="rtl">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black text-[#2F2F2F]">
                              הצטרפות ל{plan.nameHe}
                            </DialogTitle>
                            <DialogDescription className="text-[#767676]">
                              מלא את הפרטים להצטרפות לביטוח
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="font-bold text-[#2F2F2F]">בחר חיית מחמד</Label>
                              <Select>
                                <SelectTrigger className="mt-2 rounded-xl">
                                  <SelectValue placeholder="בחר חיית מחמד" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pet1">מקס (כלב)</SelectItem>
                                  <SelectItem value="pet2">לונה (חתולה)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-[#2F2F2F]">
                                  <p className="font-bold mb-1">תקופת אכשרה</p>
                                  <p className="text-xs text-[#767676]">
                                    • כיסוי תאונות: 72 שעות מתחילת הביטוח<br/>
                                    • כיסוי מחלות: 45 יום מתחילת הביטוח
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <div className="flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-[#2F2F2F]">
                                  <p className="font-bold mb-1">דרישות זיהוי</p>
                                  <p className="text-xs text-[#767676]">
                                    • כלב: חובת סימון בשבב אלקטרוני<br/>
                                    • חתול: צילום דיגיטלי עדכני
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Button
                              className="w-full bg-[#F7BF00] hover:bg-[#E3A700] text-[#2F2F2F] rounded-full font-bold py-6"
                              onClick={() => {
                                toast({
                                  title: "הבקשה נשלחה!",
                                  description: "נציג יצור איתך קשר בהקדם להשלמת התהליך.",
                                });
                              }}
                            >
                              שלח בקשה להצטרפות
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
              <h2 className="text-lg font-black text-[#2F2F2F] mb-4">כיסויים נוספים</h2>
              <div className="space-y-3">
                {additionalCoverages.map((coverage, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-[#3E8DFB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <coverage.icon className="w-6 h-6 text-[#3E8DFB]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-[#2F2F2F] mb-1">{coverage.title}</h3>
                          <p className="text-xs text-[#767676] mb-2">{coverage.description}</p>
                          <span className="text-xs font-bold text-[#3E8DFB] bg-[#3E8DFB]/10 px-3 py-1 rounded-full">
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
              <h2 className="text-lg font-black text-[#2F2F2F] mb-4">מה מכוסה?</h2>
              <div className="space-y-3">
                {[
                  { icon: Stethoscope, title: "בדיקות ואבחון", desc: "בדיקות פיזיות, דיאגנוסטיות ומעבדה", color: "bg-blue-500" },
                  { icon: Syringe, title: "הליכים רפואיים", desc: "ניתוחים והליכים כירורגיים", color: "bg-green-500" },
                  { icon: Pill, title: "תרופות", desc: "תרופות במרשם רופא וטרינר", color: "bg-purple-500" },
                  { icon: Activity, title: "פיזיותרפיה", desc: "עד 4 טיפולים בשנה", color: "bg-orange-500" },
                  { icon: Building2, title: "אשפוז", desc: "אשפוז בבית חולים וטרינרי", color: "bg-red-500" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#2F2F2F]">{item.title}</h4>
                          <p className="text-xs text-[#767676]">{item.desc}</p>
                        </div>
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div>
              <h2 className="text-lg font-black text-[#2F2F2F] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                חריגים (מה לא מכוסה?)
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {exclusions.map((exclusion) => (
                  <AccordionItem key={exclusion.id} value={exclusion.id} className="border-0">
                    <Card className="overflow-hidden">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-red-50">
                        <span className="font-bold text-[#2F2F2F] text-sm">{exclusion.title}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <ul className="space-y-2">
                          {exclusion.items.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-[#767676]">
                              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
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
            <Card className="p-5 bg-amber-50 border-amber-200">
              <h3 className="font-bold text-[#2F2F2F] mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-600" />
                הערות חשובות
              </h3>
              <ul className="space-y-2 text-sm text-[#555555]">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  תקופת אכשרה של 45 יום למחלות (לא חלה על תאונות)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  כיסוי תאונות נכנס לתוקף 72 שעות מתחילת הביטוח
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  חובה על חיסונים עדכניים לפי הנחיות הפוליסה
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  טיפול נגד תולעת הפארק אחת ל-3 חודשים
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-lg font-black text-[#2F2F2F] mb-4">הגשת תביעה</h2>
              <Card className="p-5">
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  <div>
                    <Label className="font-bold text-[#2F2F2F]">חיית מחמד</Label>
                    <Select
                      value={claimFormData.petName}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, petName: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl">
                        <SelectValue placeholder="בחר חיית מחמד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max">מקס (כלב)</SelectItem>
                        <SelectItem value="luna">לונה (חתולה)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-bold text-[#2F2F2F]">סוג התביעה</Label>
                    <Select
                      value={claimFormData.claimType}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, claimType: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl">
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

                  <div>
                    <Label className="font-bold text-[#2F2F2F]">תאריך הטיפול</Label>
                    <Input
                      type="date"
                      value={claimFormData.claimDate}
                      onChange={(e) => setClaimFormData({ ...claimFormData, claimDate: e.target.value })}
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-[#2F2F2F]">סכום התביעה</Label>
                    <div className="relative mt-2">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#767676]">₪</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={claimFormData.claimAmount}
                        onChange={(e) => setClaimFormData({ ...claimFormData, claimAmount: e.target.value })}
                        className="pr-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-bold text-[#2F2F2F]">שם המרפאה/וטרינר</Label>
                    <Input
                      type="text"
                      placeholder="שם המרפאה הווטרינרית"
                      value={claimFormData.vetName}
                      onChange={(e) => setClaimFormData({ ...claimFormData, vetName: e.target.value })}
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-[#2F2F2F]">תיאור המקרה</Label>
                    <Textarea
                      placeholder="תאר את נסיבות המקרה והטיפול שניתן..."
                      value={claimFormData.description}
                      onChange={(e) => setClaimFormData({ ...claimFormData, description: e.target.value })}
                      className="mt-2 rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-[#2F2F2F] mb-2 block">העלאת מסמכים</Label>
                    <div className="border-2 border-dashed border-[#DDDDDD] rounded-xl p-8 text-center hover:border-[#F7BF00] transition-colors cursor-pointer bg-[#F6F6F6]">
                      <Upload className="w-8 h-8 text-[#767676] mx-auto mb-2" />
                      <p className="text-sm text-[#555555]">
                        לחץ להעלאת חשבוניות, קבלות או מסמכים רפואיים
                      </p>
                      <p className="text-xs text-[#767676] mt-1">PDF, JPG, PNG (עד 10MB)</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#F7BF00] hover:bg-[#E3A700] text-[#2F2F2F] rounded-full font-bold py-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    הגש תביעה
                    <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                  </Button>
                </form>
              </Card>
            </motion.div>

            {/* Recent Claims */}
            <div>
              <h3 className="text-lg font-black text-[#2F2F2F] mb-4">תביעות אחרונות</h3>
              <div className="space-y-3">
                {[
                  { pet: "מקס", type: "טיפול חירום", amount: "₪850", status: "אושר", statusColor: "bg-green-100 text-green-700", date: "15.01.2025" },
                  { pet: "לונה", type: "בדיקות", amount: "₪320", status: "בטיפול", statusColor: "bg-amber-100 text-amber-700", date: "10.01.2025" },
                ].map((claim, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-[#2F2F2F]">{claim.pet}</h4>
                          <span className="text-xs text-[#767676]">• {claim.type}</span>
                        </div>
                        <p className="text-xs text-[#767676]">{claim.date}</p>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-black text-[#2F2F2F] mb-1">{claim.amount}</div>
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${claim.statusColor}`}>
                          {claim.status}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            {/* About the Policy */}
            <Card className="p-5">
              <h2 className="text-lg font-black text-[#2F2F2F] mb-4">אודות הפוליסה</h2>
              <div className="space-y-4 text-sm text-[#555555]">
                <p>
                  פוליסה זו מספקת כיסוי להחזר הוצאות רפואיות עבור כלבים וחתולים בלבד, 
                  השייכים למבוטח והמצויים באחריותו ובהשגחתו בגבולות מדינת ישראל.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F6F6F6] rounded-xl p-3">
                    <div className="text-xs text-[#767676]">תקופת ביטוח</div>
                    <div className="font-bold text-[#2F2F2F]">עד 5 שנים</div>
                  </div>
                  <div className="bg-[#F6F6F6] rounded-xl p-3">
                    <div className="text-xs text-[#767676]">תקופת אכשרה</div>
                    <div className="font-bold text-[#2F2F2F]">45 יום</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Identification Requirements */}
            <Card className="p-5">
              <h3 className="font-bold text-[#2F2F2F] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3E8DFB]" />
                דרישות זיהוי
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    🐕
                  </div>
                  <div>
                    <div className="font-bold text-[#2F2F2F] text-sm">כלב</div>
                    <p className="text-xs text-[#767676]">חובת סימון בשבב אלקטרוני</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    🐈
                  </div>
                  <div>
                    <div className="font-bold text-[#2F2F2F] text-sm">חתול</div>
                    <p className="text-xs text-[#767676]">צילום דיגיטלי עדכני</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Vaccine Requirements */}
            <Card className="p-5">
              <h3 className="font-bold text-[#2F2F2F] mb-4 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-green-500" />
                דרישות חיסונים
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="dogs" className="border-0 bg-[#F6F6F6] rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="font-bold text-sm">חיסונים לכלבים</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-[#555555]">
                    <ul className="space-y-1">
                      <li>• כלבת - לפי חוק</li>
                      <li>• לפטוספירה - אחת לשנה</li>
                      <li>• פארוו, כלבלבת, אדנו-וירוס - אחת ל-3 שנים</li>
                      <li>• גורים: לפחות 2 חיסוני מתומן</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cats" className="border-0 bg-[#F6F6F6] rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="font-bold text-sm">חיסונים לחתולים</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-[#555555]">
                    <ul className="space-y-1">
                      <li>• כלבת - אחת ל-3 שנים</li>
                      <li>• משולש/מרובע - אחת ל-3 שנים</li>
                      <li>• גורים: לפחות 2 חיסונים</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Contact */}
            <Card className="p-5 bg-gradient-to-br from-[#F7BF00]/10 to-white">
              <h3 className="font-bold text-[#2F2F2F] mb-4">צריכים עזרה?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Phone className="w-6 h-6 text-[#F7BF00]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#2F2F2F] text-sm">טלפון</div>
                    <div className="text-sm text-[#767676]">*6050</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Mail className="w-6 h-6 text-[#F7BF00]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#2F2F2F] text-sm">אימייל</div>
                    <div className="text-sm text-[#767676]">sherut@shomera.co.il</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Insurance Provider */}
            <Card className="p-5 border-2 border-[#F7BF00]/30">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#F7BF00]/10 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-[#F7BF00]" />
                </div>
                <div>
                  <div className="font-black text-[#2F2F2F]">שומרה חברה לביטוח בע"מ</div>
                  <p className="text-xs text-[#767676]">הסיבים 23, פתח תקווה</p>
                  <p className="text-xs text-[#767676]">מיקוד 4959381</p>
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
