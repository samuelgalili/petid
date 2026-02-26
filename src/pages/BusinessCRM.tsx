import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Search, Users, MessageCircle, X,
  Send, Dog, Cat, TrendingUp, Clock, Filter,
  FlaskConical, ChevronDown, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScienceBadge } from '@/components/ui/ScienceBadge';
import { cn } from '@/lib/utils';

// ─── Types ───
type PetType = 'all' | 'dog' | 'cat';
type SpendFilter = 'all' | 'high' | 'inactive';

interface Customer {
  id: string;
  name: string;
  avatar: string;
  petName: string;
  petBreed: string;
  petAge: string;
  petType: 'dog' | 'cat';
  totalSpent: number;
  lastPurchase: string;
  daysInactive: number;
  recommendation: string;
  recommendationReason: string;
}

// ─── Mock Data ───
const customers: Customer[] = [
  { id: '1', name: 'דני כהן', avatar: '👤', petName: 'לוקי', petBreed: 'גולדן רטריבר', petAge: '3 שנים', petType: 'dog', totalSpent: 2840, lastPurchase: '2026-02-22', daysInactive: 3, recommendation: 'Omega-3 Joint Support', recommendationReason: 'גולדן רטריבר בגיל 3 — NRC ממליץ על תוסף מפרקים מונע.' },
  { id: '2', name: 'שרה לוי', avatar: '👤', petName: 'מילו', petBreed: 'לברדור', petAge: '5 שנים', petType: 'dog', totalSpent: 4120, lastPurchase: '2026-02-20', daysInactive: 5, recommendation: 'Weight Management Food', recommendationReason: 'לברדור בגיל 5 נוטה לעודף משקל — MER מחושב: 1,320 kcal/יום.' },
  { id: '3', name: 'יוסי אברהם', avatar: '👤', petName: 'לונה', petBreed: 'חתול פרסי', petAge: '2 שנים', petType: 'cat', totalSpent: 1560, lastPurchase: '2026-02-18', daysInactive: 7, recommendation: 'Hairball Control Formula', recommendationReason: 'פרסי בגיל 2 — NRC מציין צורך בסיבים תזונתיים למניעת כדורי שיער.' },
  { id: '4', name: 'מיכל רוזן', avatar: '👤', petName: 'באדי', petBreed: 'בולדוג צרפתי', petAge: '1.5 שנים', petType: 'dog', totalSpent: 890, lastPurchase: '2026-01-15', daysInactive: 41, recommendation: 'Hypoallergenic Kibble', recommendationReason: 'בולדוג צרפתי רגיש לאלרגיות עור — NRC ממליץ על דיאטה היפואלרגנית.' },
  { id: '5', name: 'רון גולדשטיין', avatar: '👤', petName: 'נאלה', petBreed: 'האסקי סיבירי', petAge: '4 שנים', petType: 'dog', totalSpent: 5200, lastPurchase: '2026-02-24', daysInactive: 1, recommendation: 'High-Protein Performance', recommendationReason: 'האסקי פעיל בגיל 4 — MER גבוה: 1,800 kcal/יום, צורך בחלבון מוגבר.' },
  { id: '6', name: 'תמר שפירא', avatar: '👤', petName: 'סימבה', petBreed: 'חתול בריטי', petAge: '6 שנים', petType: 'cat', totalSpent: 320, lastPurchase: '2025-12-10', daysInactive: 77, recommendation: 'Senior Cat Vitality Mix', recommendationReason: 'בריטי קצר שיער בגיל 6 — מתקרב לגיל סניור, NRC ממליץ על תוספי ויטמין E ו-טאורין.' },
  { id: '7', name: 'אלון פרץ', avatar: '👤', petName: 'רוקי', petBreed: 'רועה גרמני', petAge: '7 שנים', petType: 'dog', totalSpent: 3650, lastPurchase: '2026-02-10', daysInactive: 15, recommendation: 'Hip & Joint Advanced', recommendationReason: 'רועה גרמני בגיל 7 — NRC מדגיש צורך בגלוקוזאמין וכונדרואיטין.' },
];

const BusinessCRM = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [petFilter, setPetFilter] = useState<PetType>('all');
  const [spendFilter, setSpendFilter] = useState<SpendFilter>('all');
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, { role: 'me' | 'them'; text: string }[]>>({});

  const filtered = customers.filter(c => {
    if (search && !c.name.includes(search) && !c.petName.includes(search) && !c.petBreed.includes(search)) return false;
    if (petFilter !== 'all' && c.petType !== petFilter) return false;
    if (spendFilter === 'high' && c.totalSpent < 3000) return false;
    if (spendFilter === 'inactive' && c.daysInactive < 30) return false;
    return true;
  });

  const sendMessage = (customerId: string) => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => ({
      ...prev,
      [customerId]: [...(prev[customerId] || []), { role: 'me', text: chatInput.trim() }],
    }));
    setChatInput('');
  };

  const chatCustomer = customers.find(c => c.id === chatOpen);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[15px] font-semibold tracking-tight">ניהול לקוחות</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">

        {/* ─── Search & Filters ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pr-10 rounded-2xl h-11 bg-muted/30 border-border/40"
              placeholder="חיפוש לפי שם, חיית מחמד או גזע..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Pet Type */}
            {([
              { key: 'all' as PetType, label: 'הכל', icon: null },
              { key: 'dog' as PetType, label: 'כלבים', icon: Dog },
              { key: 'cat' as PetType, label: 'חתולים', icon: Cat },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setPetFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  petFilter === f.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {f.icon && <f.icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {f.label}
              </button>
            ))}

            <div className="w-px bg-border mx-1" />

            {/* Spend Filters */}
            {([
              { key: 'all' as SpendFilter, label: 'כולם' },
              { key: 'high' as SpendFilter, label: '₪3,000+', icon: TrendingUp },
              { key: 'inactive' as SpendFilter, label: 'לא פעילים', icon: Clock },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setSpendFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  spendFilter === f.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {'icon' in f && f.icon && <f.icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                {f.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">{filtered.length} לקוחות</p>
        </motion.div>

        {/* ─── Customer Cards ─── */}
        <div className="space-y-3">
          {filtered.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="border border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div className="p-4 flex items-start gap-3">
                    {/* Avatar + Pet */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-lg">
                        {customer.petType === 'dog' ? '🐕' : '🐈'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{customer.name}</p>
                        <span className="text-xs font-bold">₪{customer.totalSpent.toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {customer.petName} · {customer.petBreed} · {customer.petAge}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>רכישה אחרונה: {customer.lastPurchase}</span>
                        {customer.daysInactive > 30 && (
                          <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                            לא פעיל {customer.daysInactive} ימים
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation */}
                  <div className="mx-4 mb-3 rounded-2xl bg-primary/[0.03] border border-primary/10 p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FlaskConical className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">המלצה חכמה</span>
                          <ScienceBadge size="sm" />
                        </div>
                        <p className="text-xs font-semibold">{customer.recommendation}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{customer.recommendationReason}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl h-8 text-[11px] gap-1.5"
                      onClick={() => setChatOpen(customer.id)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      שלח הודעה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl h-8 text-[11px] gap-1.5 text-primary"
                      onClick={() => navigate('/product-sourcing')}
                    >
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                      שלח המלצה
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">לא נמצאו לקוחות</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat Drawer ─── */}
      <AnimatePresence>
        {chatOpen && chatCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            onClick={() => setChatOpen(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 max-w-lg mx-auto bg-background rounded-t-[24px] border border-border/40 shadow-xl max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-base">
                    {chatCustomer.petType === 'dog' ? '🐕' : '🐈'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{chatCustomer.name}</p>
                    <p className="text-[10px] text-muted-foreground">{chatCustomer.petName} · {chatCustomer.petBreed}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setChatOpen(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px]">
                {(!chatMessages[chatOpen] || chatMessages[chatOpen].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">התחל שיחה עם {chatCustomer.name}</p>
                  </div>
                )}
                {(chatMessages[chatOpen] || []).map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'me' ? 'justify-start' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed',
                      msg.role === 'me'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="px-4 pb-5 pt-2 border-t border-border/30">
                <div className="flex gap-2">
                  <Input
                    className="flex-1 rounded-2xl h-10 text-xs bg-muted/30 border-border/40"
                    placeholder="כתוב הודעה..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage(chatOpen!)}
                  />
                  <Button
                    size="icon"
                    className="rounded-xl h-10 w-10"
                    onClick={() => sendMessage(chatOpen!)}
                    disabled={!chatInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusinessCRM;
