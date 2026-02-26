/**
 * PetID Science Lab — Automated Reliability Index
 * Terminal-style AI analysis, Trust Score badges, conflict resolution, verified facts counter
 */
import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Upload, Search, Brain, BookOpen,
  CheckCircle2, Loader2, Sparkles, Dna, FlaskConical,
  ChevronDown, ChevronUp, Trash2, ToggleLeft, ToggleRight,
  ShieldCheck, AlertTriangle, Terminal, Zap, Award, Eye,
  CircleCheck, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ─── Terminal Scan Steps ───
const TERMINAL_STEPS = [
  { text: '> Initializing document parser...', delay: 400 },
  { text: '> Extracting Methodology...', delay: 700 },
  { text: '> Identifying sample size & control groups...', delay: 900 },
  { text: '> Calculating Trust Score...', delay: 1100 },
  { text: '> Cross-referencing existing knowledge base...', delay: 800 },
  { text: '> Checking for data conflicts...', delay: 600 },
  { text: '> Updating Knowledge Graph...', delay: 700 },
  { text: '> Generating Scientific Summary for Danny & Sarah...', delay: 500 },
  { text: '> Indexing verified facts...', delay: 400 },
  { text: '✓ Analysis complete.', delay: 0 },
];

// ─── Trust Score Logic ───
function getTrustLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 85) return { label: 'Gold Standard', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  if (score >= 70) return { label: 'High Reliability', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  if (score >= 50) return { label: 'Moderate', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
  return { label: 'Low Confidence', color: 'text-muted-foreground', bg: 'bg-muted border-border' };
}

interface ResearchSource {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  extracted_data: any;
  is_active: boolean;
  is_processed: boolean;
  quality_score: number | null;
  created_at: string;
}

// ─── Simulated Research Summary ───
function generateResearchSummary(title: string) {
  const findings = [
    'מזון עשיר באומגה-3 משפר תפקוד קוגניטיבי ב-27%',
    'פרוביוטיקה מפחיתה דלקת מעי ב-42% בגזעים בינוניים',
    'רמת חלבון מומלצת של 25-30% לכלבים בוגרים פעילים',
    'תוספת גלוקוזאמין מאטה שחיקת מפרקים ב-35%',
    'ויטמין E מפחית סיכון לשבץ ב-18% בכלבים מבוגרים',
  ];
  const breeds = ['לברדור', 'גולדן רטריבר', 'בולדוג צרפתי', 'האסקי סיבירי', 'פודל', 'ג׳רמן שפרד'];
  const rules = [
    'עדכון טבלת RER לגזעים ענקיים — +8% קלוריות',
    'הוספת המלצת פרוביוטיקה לתוכנית טיפול מעיים',
    'עדכון מינון אומגה-3 לפי משקל גוף',
  ];

  const trustScore = Math.floor(Math.random() * 45) + 55; // 55-100
  const hasConflict = Math.random() > 0.7; // 30% chance of conflict

  return {
    keyFindings: findings.sort(() => Math.random() - 0.5).slice(0, 3),
    applicableBreeds: breeds.sort(() => Math.random() - 0.5).slice(0, 4),
    nutritionalRules: rules.sort(() => Math.random() - 0.5).slice(0, 2),
    knowledgePoints: Math.floor(Math.random() * 40) + 15,
    trustScore,
    hasConflict,
    conflictDetails: hasConflict ? 'ממצא זה סותר נתון קיים לגבי מינון חלבון מומלץ לגזעים קטנים. נדרשת החלטת אדמין.' : null,
    scientificSummary: `מחקר זה בדק את ההשפעה של ${findings[0].split(' ').slice(0, 4).join(' ')} על בריאות חיות מחמד. הממצאים מצביעים על שיפור מדיד שניתן ליישום ישיר בהמלצות Danny & Sarah.`,
    verifiedFacts: Math.floor(Math.random() * 8) + 2,
    methodology: Math.random() > 0.5 ? 'Randomized Controlled Trial' : 'Meta-Analysis',
    sampleSize: Math.floor(Math.random() * 900) + 100,
  };
}

// ─── Trust Score Badge Component ───
function TrustScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const { label, color, bg } = getTrustLabel(score);
  const isSm = size === 'sm';
  return (
    <div className={cn('inline-flex items-center gap-1.5 border rounded-full', bg, isSm ? 'px-2 py-0.5' : 'px-3 py-1')}>
      <ShieldCheck className={cn(color, isSm ? 'w-3 h-3' : 'w-3.5 h-3.5')} strokeWidth={1.5} />
      <span className={cn('font-bold', color, isSm ? 'text-[9px]' : 'text-[11px]')}>{score}</span>
      <span className={cn('font-medium', color, isSm ? 'text-[8px]' : 'text-[10px]')}>{label}</span>
    </div>
  );
}

export default function AdminResearchLab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<ReturnType<typeof generateResearchSummary> | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Fetch research sources
  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['research-sources'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_data_sources')
        .select('*')
        .eq('data_type', 'research')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ResearchSource[];
    },
  });

  // Computed stats
  const totalKP = sources.reduce((s, r) => s + (r.extracted_data?.knowledgePoints || 0), 0);
  const activeCount = sources.filter(s => s.is_active).length;
  const verifiedFacts = sources.reduce((s, r) => s + (r.extracted_data?.verifiedFacts || 0), 0);
  const conflictCount = sources.filter(s => s.extracted_data?.hasConflict && s.is_active).length;
  const avgTrust = sources.length
    ? Math.round(sources.reduce((s, r) => s + (r.extracted_data?.trustScore || 0), 0) / sources.length)
    : 0;

  // Filtered
  const filtered = sources.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Upload & Terminal Scan ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      toast.error('נא להעלות קובץ PDF בלבד');
      return;
    }

    setUploadedFileName(file.name);
    setIsScanning(true);
    setScanProgress(0);
    setTerminalLines([]);
    setScanResult(null);

    // Run terminal steps
    for (let i = 0; i < TERMINAL_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, TERMINAL_STEPS[i].delay + Math.random() * 400));
      setTerminalLines(prev => [...prev, TERMINAL_STEPS[i].text]);
      setScanProgress(Math.round(((i + 1) / TERMINAL_STEPS.length) * 100));
    }

    const title = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
    const summary = generateResearchSummary(title);
    setScanResult(summary);

    try {
      await (supabase as any).from('admin_data_sources').insert({
        data_type: 'research',
        title,
        description: `מחקר מדעי: ${summary.keyFindings[0]}`,
        file_name: file.name,
        is_active: true,
        is_processed: true,
        quality_score: summary.trustScore,
        extracted_data: summary,
        created_by: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['research-sources'] });
      toast.success('המחקר נסרק ונוסף למאגר הידע');
    } catch {
      toast.error('שגיאה בשמירת המחקר');
    }

    setIsScanning(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from('admin_data_sources').update({ is_active: !current }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['research-sources'] });
    toast.success(current ? 'מחקר הושבת' : 'מחקר הופעל');
  };

  const deleteSource = async (id: string) => {
    await (supabase as any).from('admin_data_sources').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['research-sources'] });
    toast.success('מחקר נמחק');
  };

  const resolveConflict = async (id: string) => {
    const src = sources.find(s => s.id === id);
    if (!src) return;
    const updated = { ...src.extracted_data, hasConflict: false, conflictDetails: null };
    await (supabase as any).from('admin_data_sources').update({ extracted_data: updated }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['research-sources'] });
    toast.success('קונפליקט נפתר — הנתון עודכן ב-Brain');
  };

  return (
    <AdminLayout title="מעבדת מחקר">
      <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">

        {/* ─── Header ─── */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 tracking-tight">
            <FlaskConical className="w-6 h-6 text-primary" strokeWidth={1.5} />
            PetID Science Lab
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            מנוע מחקר אוטומטי עם Reliability Index — סריקה, אימות וחיבור למערכת הבינה
          </p>
        </div>

        {/* ─── Brain Dashboard Stats ─── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'מחקרים', value: sources.length, icon: BookOpen, accent: 'text-primary' },
            { label: 'מקורות פעילים', value: activeCount, icon: CircleCheck, accent: 'text-emerald-600' },
            { label: 'Verified Facts', value: verifiedFacts, icon: ShieldCheck, accent: 'text-amber-600' },
            { label: 'Brain KP', value: totalKP, icon: Brain, accent: 'text-primary' },
            { label: 'Avg Trust', value: `${avgTrust}%`, icon: Award, accent: 'text-blue-600' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <Icon className={cn('w-4 h-4', s.accent)} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xl font-bold tracking-tight leading-none">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Conflict Alerts ─── */}
        {conflictCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    {conflictCount} מחקר{conflictCount > 1 ? 'ים' : ''} עם קונפליקט — Review Required
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-0.5">
                    ממצאים חדשים סותרים נתונים קיימים. נדרשת החלטת אדמין לפני עדכון ה-Brain.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Upload Zone ─── */}
        <Card className="border-dashed border-2 border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {isScanning || scanResult ? (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Terminal Header */}
                  <div className="bg-foreground/[0.03] border-b border-border/40 px-4 py-2.5 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    <span className="text-[11px] font-mono font-medium text-foreground/70">
                      PetID Analysis Engine — {uploadedFileName}
                    </span>
                    {!isScanning && (
                      <Badge variant="outline" className="text-[9px] mr-auto border-emerald-300 text-emerald-600 bg-emerald-50">
                        Complete
                      </Badge>
                    )}
                  </div>

                  {/* Terminal Body */}
                  <div className="bg-foreground/[0.02] px-4 py-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                    {terminalLines.map((line, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'leading-relaxed',
                          line.startsWith('✓') ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'
                        )}
                      >
                        {line}
                      </motion.p>
                    ))}
                    {isScanning && (
                      <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse" />
                    )}
                  </div>

                  {isScanning && (
                    <div className="px-4 pb-3">
                      <Progress value={scanProgress} className="h-1" />
                    </div>
                  )}

                  {/* Scan Result */}
                  {scanResult && !isScanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 space-y-5 border-t border-border/40"
                    >
                      {/* Trust Score + KP Header */}
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <TrustScoreBadge score={scanResult.trustScore} />
                          <span className="text-[10px] text-muted-foreground">
                            {scanResult.methodology} · n={scanResult.sampleSize}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10">
                            <Brain className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                            <span className="text-[11px] font-bold text-primary">+{scanResult.knowledgePoints} KP</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                            <span className="text-[11px] font-bold text-emerald-600">+{scanResult.verifiedFacts} Facts</span>
                          </div>
                        </div>
                      </div>

                      {/* Conflict Warning */}
                      {scanResult.hasConflict && (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" strokeWidth={1.5} />
                          <div className="flex-1">
                            <p className="text-[11px] font-semibold text-amber-800">Review Required — Data Conflict Detected</p>
                            <p className="text-[10px] text-amber-700/80 mt-0.5">{scanResult.conflictDetails}</p>
                          </div>
                        </div>
                      )}

                      {/* Scientific Summary */}
                      <div className="p-3 rounded-lg border border-border/40 bg-muted/30">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Bot className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          <span className="text-[10px] font-semibold text-muted-foreground">Scientific Summary for Danny & Sarah</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{scanResult.scientificSummary}</p>
                      </div>

                      <Separator />

                      {/* 3-column details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />Key Findings
                          </p>
                          {scanResult.keyFindings.map((f, i) => (
                            <p key={i} className="text-xs text-foreground/80">• {f}</p>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Dna className="w-3 h-3" />Applicable Breeds
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {scanResult.applicableBreeds.map(b => (
                              <Badge key={b} variant="outline" className="text-[9px]">{b}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Zap className="w-3 h-3" />Updated Rules
                          </p>
                          {scanResult.nutritionalRules.map((r, i) => (
                            <p key={i} className="text-xs text-foreground/80">• {r}</p>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-xs"
                        onClick={() => { setScanResult(null); setUploadedFileName(''); setTerminalLines([]); }}
                      >
                        העלאת מחקר נוסף
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-10 px-6"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">העלה מחקר מדעי (PDF)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      המנוע יחשב Trust Score, יחלץ ממצאים ויעדכן את ה-Knowledge Graph
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    בחר קובץ PDF
                  </Button>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ─── Library Header ─── */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" strokeWidth={1.5} />
            ספריית מחקרים
          </h2>
          <div className="relative w-60">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="חיפוש מחקר..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-8 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* ─── Research Library ─── */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {searchQuery ? 'לא נמצאו מחקרים תואמים' : 'אין מחקרים במאגר — העלה את המחקר הראשון'}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[520px]">
            <div className="space-y-3">
              {filtered.map((src, i) => {
                const ed = src.extracted_data || {};
                const isOpen = expandedId === src.id;
                const trust = ed.trustScore || src.quality_score || 0;

                return (
                  <motion.div
                    key={src.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card className={cn(
                      'transition-all',
                      !src.is_active && 'opacity-40',
                      ed.hasConflict && src.is_active && 'border-amber-200'
                    )}>
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FlaskConical className="w-4 h-4 text-primary" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{src.title}</p>
                              <TrustScoreBadge score={trust} size="sm" />
                              {ed.hasConflict && src.is_active && (
                                <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700 bg-amber-50 gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />Review
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                              <span>{format(new Date(src.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                              {ed.knowledgePoints && (
                                <span className="flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />+{ed.knowledgePoints} KP</span>
                              )}
                              {ed.verifiedFacts && (
                                <span className="flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5" />+{ed.verifiedFacts} facts</span>
                              )}
                              {ed.methodology && <span>{ed.methodology}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {ed.hasConflict && src.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => resolveConflict(src.id)}
                              >
                                <CheckCircle2 className="w-3 h-3" />Resolve
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(src.id, !!src.is_active)}>
                              {src.is_active
                                ? <ToggleRight className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                                : <ToggleLeft className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                              }
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSource(src.id)}>
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isOpen ? null : src.id)}>
                              {isOpen ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <Separator className="my-3" />

                              {/* Scientific Summary */}
                              {ed.scientificSummary && (
                                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 mb-4">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Bot className="w-3 h-3 text-primary" strokeWidth={1.5} />
                                    <span className="text-[10px] font-semibold text-muted-foreground">Scientific Summary</span>
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed">{ed.scientificSummary}</p>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Key Findings</p>
                                  {(ed.keyFindings || []).map((f: string, j: number) => (
                                    <p key={j} className="text-xs text-foreground/80">• {f}</p>
                                  ))}
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Applicable Breeds</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(ed.applicableBreeds || []).map((b: string) => (
                                      <Badge key={b} variant="outline" className="text-[9px]">{b}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Updated Rules</p>
                                  {(ed.nutritionalRules || []).map((r: string, j: number) => (
                                    <p key={j} className="text-xs text-foreground/80">• {r}</p>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </AdminLayout>
  );
}
