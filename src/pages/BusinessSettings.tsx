import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Wallet, Store, Truck, Brain,
  CreditCard, Building2, History, ChevronLeft,
  Globe, Languages, MapPin, ToggleLeft,
  Sparkles, FlaskConical, MessageCircle, Save,
  Check, CircleDollarSign, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ───
type TabKey = 'financials' | 'store' | 'logistics' | 'ai';

const tabs: { key: TabKey; label: string; icon: typeof Wallet }[] = [
  { key: 'financials', label: 'פיננסי', icon: Wallet },
  { key: 'store', label: 'חנות', icon: Store },
  { key: 'logistics', label: 'לוגיסטיקה', icon: Truck },
  { key: 'ai', label: 'AI', icon: Brain },
];

// ─── Mock Data ───
const payoutHistory = [
  { id: '1', date: '2026-02-20', amount: 1240, status: 'completed', method: 'Bank Transfer' },
  { id: '2', date: '2026-02-10', amount: 890, status: 'completed', method: 'Bank Transfer' },
  { id: '3', date: '2026-01-28', amount: 2100, status: 'completed', method: 'PayPal' },
  { id: '4', date: '2026-01-15', amount: 560, status: 'pending', method: 'Bank Transfer' },
];

const BusinessSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('financials');

  // Settings state
  const [currency, setCurrency] = useState('ILS');
  const [language, setLanguage] = useState('he');
  const [autoRestock, setAutoRestock] = useState(true);
  const [scienceOnly, setScienceOnly] = useState(false);
  const [aiPersonality, setAiPersonality] = useState([50]);
  const [shippingProvider, setShippingProvider] = useState('hfd');
  const [internationalProvider, setInternationalProvider] = useState('yunexpress');
  const [autoLabels, setAutoLabels] = useState(true);
  const [proactiveInsights, setProactiveInsights] = useState(true);
  const [scienceBadgeFilter, setScienceBadgeFilter] = useState(true);

  const handleSave = () => {
    toast.success('ההגדרות נשמרו בהצלחה');
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <span className="text-[15px] font-semibold tracking-tight">הגדרות עסק</span>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            שמור
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* ─── Tab Navigation ─── */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 mb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── Tab Content ─── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >

          {/* ═══ FINANCIALS ═══ */}
          {activeTab === 'financials' && (
            <>
              {/* Payout Methods */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <CardTitle className="text-sm font-semibold">אמצעי תשלום</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connected Account */}
                  <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">בנק לאומי</p>
                        <p className="text-[11px] text-muted-foreground">חשבון ••••4821 · סניף 628</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <Check className="w-3 h-3" />
                        מאומת
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full rounded-2xl h-11 text-xs gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף אמצעי תשלום
                  </Button>

                  {/* Balance Summary */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { label: 'יתרה זמינה', value: '₪3,240', color: 'text-foreground' },
                      { label: 'ממתין לאישור', value: '₪890', color: 'text-muted-foreground' },
                      { label: 'סה"כ משיכות', value: '₪4,790', color: 'text-muted-foreground' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawal History */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <CardTitle className="text-sm font-semibold">היסטוריית משיכות</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payoutHistory.map(p => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                        <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center">
                          <CircleDollarSign className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">₪{p.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{p.date} · {p.method}</p>
                        </div>
                        <span className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-500'
                        )}>
                          {p.status === 'completed' ? 'הושלם' : 'ממתין'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ STORE SETTINGS ═══ */}
          {activeTab === 'store' && (
            <>
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">הגדרות כלליות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Currency */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CircleDollarSign className="w-3.5 h-3.5" />
                      מטבע
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ILS">₪ שקל ישראלי (ILS)</SelectItem>
                        <SelectItem value="USD">$ דולר אמריקאי (USD)</SelectItem>
                        <SelectItem value="EUR">€ אירו (EUR)</SelectItem>
                        <SelectItem value="GBP">£ לירה שטרלינג (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5" />
                      שפת החנות
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he">עברית</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">השלמת מלאי אוטומטית</p>
                        <p className="text-[10px] text-muted-foreground">הזמנה אוטומטית כשהמלאי נמוך</p>
                      </div>
                      <Switch checked={autoRestock} onCheckedChange={setAutoRestock} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">הצג רק מוצרים מאומתים</p>
                        <p className="text-[10px] text-muted-foreground">סנן מוצרים ללא תג Science-Verified</p>
                      </div>
                      <Switch checked={scienceOnly} onCheckedChange={setScienceOnly} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Store Info */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">פרטי חנות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">שם החנות</Label>
                    <Input className="rounded-xl h-11" placeholder="שם החנות שלך" defaultValue="PetID Premium Shop" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">אימייל תמיכה</Label>
                    <Input className="rounded-xl h-11" type="email" placeholder="support@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">טלפון</Label>
                    <Input className="rounded-xl h-11" type="tel" placeholder="050-0000000" dir="ltr" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ LOGISTICS ═══ */}
          {activeTab === 'logistics' && (
            <>
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <CardTitle className="text-sm font-semibold">ספקי שילוח</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Local */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">שילוח מקומי (ישראל)</Label>
                    <Select value={shippingProvider} onValueChange={setShippingProvider}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hfd">HFD Express</SelectItem>
                        <SelectItem value="zigzag">ZigZag</SelectItem>
                        <SelectItem value="israelpost">דואר ישראל</SelectItem>
                        <SelectItem value="cheetah">Cheetah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* International */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">שילוח בינלאומי</Label>
                    <Select value={internationalProvider} onValueChange={setInternationalProvider}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yunexpress">YunExpress</SelectItem>
                        <SelectItem value="cainiao">Cainiao</SelectItem>
                        <SelectItem value="dhl">DHL eCommerce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto Labels */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-sm font-medium">ייצור תוויות אוטומטי</p>
                      <p className="text-[10px] text-muted-foreground">ייצר תוויות מוביל + מחסן אוטומטית עם תשלום</p>
                    </div>
                    <Switch checked={autoLabels} onCheckedChange={setAutoLabels} />
                  </div>
                </CardContent>
              </Card>

              {/* Return Address */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">כתובת החזרות</CardTitle>
                  <p className="text-[10px] text-muted-foreground">כתובת מקומית להפניית החזרות במקום סין</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">כתובת</Label>
                    <Input className="rounded-xl h-11" placeholder="רחוב, מספר" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">עיר</Label>
                      <Input className="rounded-xl h-11" placeholder="תל אביב" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">מיקוד</Label>
                      <Input className="rounded-xl h-11" placeholder="6100000" dir="ltr" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ AI PREFERENCES ═══ */}
          {activeTab === 'ai' && (
            <>
              {/* Personality Slider */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <CardTitle className="text-sm font-semibold">אישיות AI</CardTitle>
                  </div>
                  <p className="text-[10px] text-muted-foreground">התאם את סגנון התקשורת של Danny & Sarah</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Slider
                      value={aiPersonality}
                      onValueChange={setAiPersonality}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.5} />
                        מדעי / פורמלי
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        ידידותי / קליל
                        <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="rounded-2xl bg-muted/40 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-semibold">תצוגה מקדימה</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {aiPersonality[0] < 30
                          ? '"בהתבסס על נתוני NRC 2006, הצריכה היומית המומלצת של חלבון עבור גזע זה עומדת על 25g/kg משקל גוף. מומלץ לשקול מחדש את תכנית התזונה הנוכחית."'
                          : aiPersonality[0] < 70
                          ? '"היי! שמתי לב שהגולדן שלך צריך קצת יותר חלבון ביום. אני ממליץ על 25g/kg לפי הסטנדרטים. רוצה שאמצא לך מוצר מתאים?"'
                          : '"היוש! 🐕 הגולדן המתוק שלך צריך יותר חלבון! בוא נמצא לו אוכל סופר טעים שגם בריא — יש לי כמה רעיונות מעולים!"'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Toggles */}
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">העדפות חכמות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">תובנות פרואקטיביות</p>
                      <p className="text-[10px] text-muted-foreground">Danny & Sarah ישלחו המלצות אוטומטיות</p>
                    </div>
                    <Switch checked={proactiveInsights} onCheckedChange={setProactiveInsights} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">סינון Science-Verified</p>
                      <p className="text-[10px] text-muted-foreground">העדף מוצרים מאומתים בהמלצות AI</p>
                    </div>
                    <Switch checked={scienceBadgeFilter} onCheckedChange={setScienceBadgeFilter} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Save Button (Mobile) */}
          <div className="pt-4 pb-10">
            <Button
              className="w-full rounded-2xl h-12 text-sm font-semibold gap-2"
              onClick={handleSave}
            >
              <Save className="w-4 h-4" />
              שמור הגדרות
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BusinessSettings;
