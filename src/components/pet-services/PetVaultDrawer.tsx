/**
 * PetVaultDrawer — Full-screen secure document vault with OCR scanner
 * Folders: Vaccinations, Insurance, Invoices, General
 * Features: AI OCR scanning, verification badges, View + Share actions
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Upload, Eye, Share2, Loader2, Shield, Stethoscope,
  Receipt, FolderOpen, ChevronDown, Camera, Syringe, CheckCircle2,
  Sparkles, Scan, Trash2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type VaultCategory = 'vaccinations' | 'insurance' | 'invoices' | 'general';

interface PetVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pet: any;
}

const VAULT_CATEGORIES: { id: VaultCategory; label: string; icon: typeof FileText; color: string }[] = [
  { id: 'vaccinations', label: 'חיסונים', icon: Syringe, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'insurance', label: 'ביטוח', icon: Shield, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'invoices', label: 'חשבוניות', icon: Receipt, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'general', label: 'כללי', icon: FolderOpen, color: 'text-muted-foreground bg-muted/50' },
];

const CATEGORY_MAP: Record<string, VaultCategory> = {
  health: 'vaccinations',
  medical: 'vaccinations',
  vaccination: 'vaccinations',
  vaccinations: 'vaccinations',
  insurance: 'insurance',
  invoice: 'invoices',
  invoices: 'invoices',
  id: 'general',
  identification: 'general',
  general: 'general',
  training: 'general',
  grooming: 'general',
  boarding: 'general',
  food: 'general',
};

export const PetVaultDrawer = ({ isOpen, onClose, pet }: PetVaultDrawerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<VaultCategory | null>('vaccinations');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['pet-vault-documents', pet?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !pet?.id) return [];
      const { data, error } = await supabase
        .from('pet_service_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pet?.id && isOpen,
  });

  // Fetch extracted data for verification badges
  const { data: extractedData } = useQuery({
    queryKey: ['pet-vault-extracted', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_document_extracted_data')
        .select('document_id, vaccination_type, treatment_type, diagnosis')
        .eq('pet_id', pet.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pet?.id && isOpen,
  });

  const verifiedDocIds = new Set((extractedData || []).map((d: any) => d.document_id));

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('pet_service_documents')
        .delete()
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-vault-documents', pet?.id] });
      toast({ title: 'המסמך נמחק בהצלחה' });
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת המסמך', variant: 'destructive' });
    },
  });

  // Regular file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: VaultCategory) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const dbCategory = category === 'vaccinations' ? 'health' : category === 'invoices' ? 'invoice' : category;
        const { error } = await supabase
          .from('pet_service_documents')
          .insert({
            user_id: user.id,
            pet_id: pet.id,
            category: dbCategory,
            document_name: file.name,
            document_url: dataUrl,
            document_type: file.type,
            file_size: file.size,
          });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['pet-vault-documents', pet?.id] });
        toast({ title: 'המסמך הועלה בהצלחה' });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'שגיאה בהעלאת המסמך', variant: 'destructive' });
      setIsUploading(false);
    }
  };

  // OCR Scanner — capture image then send to AI
  const handleScanCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    setIsScanning(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert to base64 for AI
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];

        // 1. Save document first
        const dbCategory = 'health';
        const { data: docData, error: insertErr } = await supabase
          .from('pet_service_documents')
          .insert({
            user_id: user.id,
            pet_id: pet.id,
            category: dbCategory,
            document_name: `סריקה - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            document_url: dataUrl,
            document_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // 2. Send to AI OCR
        const { data: scanData, error: scanErr } = await supabase.functions.invoke('scan-vet-document', {
          body: {
            petId: pet.id,
            userId: user.id,
            imageBase64: base64,
            fileName: file.name,
          },
        });

        if (scanErr) throw scanErr;

        // 3. Show results
        const result = scanData?.scanResult;
        const msgs: string[] = [];
        if (result?.vaccines?.length > 0) msgs.push(`💉 ${result.vaccines.length} חיסונים`);
        if (result?.diagnoses?.length > 0) msgs.push(`🔍 ${result.diagnoses.length} אבחנות`);
        if (result?.weight) msgs.push(`⚖️ ${result.weight} ק"ג`);
        if (result?.deworming) msgs.push(`💊 תילוע`);

        toast({
          title: `🔬 המדען עיבד את המסמך של ${pet?.name}`,
          description: msgs.length > 0
            ? `${msgs.join(' | ')} — הכל מעודכן!`
            : 'המסמך נשמר בכספת',
        });

        // 4. Dispatch event so chat/dashboard can react
        window.dispatchEvent(new CustomEvent('vault-scan-complete', {
          detail: { petId: pet.id, petName: pet.name, scanResult: result },
        }));

        queryClient.invalidateQueries({ queryKey: ['pet-vault-documents', pet?.id] });
        queryClient.invalidateQueries({ queryKey: ['pet-vault-extracted', pet?.id] });

        setScannerOpen(false);
        setScanPreview(null);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'שגיאה בסריקת המסמך',
        description: 'נסה שוב או העלה את הקובץ ידנית',
        variant: 'destructive',
      });
      setIsScanning(false);
      setScanPreview(null);
    }
  }, [pet, queryClient, toast]);

  const handleView = (url: string) => window.open(url, '_blank');

  const handleShare = async (doc: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.document_name,
          text: `מסמך של ${pet?.name}: ${doc.document_name}`,
          url: doc.document_url,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(doc.document_url);
      toast({ title: 'הקישור הועתק' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupedDocs = VAULT_CATEGORIES.map((cat) => ({
    ...cat,
    docs: (documents || []).filter((d: any) => (CATEGORY_MAP[d.category] || 'general') === cat.id),
  }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[300] bg-background flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/20">
            <div className="flex items-center justify-between px-5 h-14">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                >
                  <Shield className="w-4 h-4 text-primary" />
                </motion.div>
                <div>
                  <h1 className="text-base font-bold text-foreground">הכספת של {pet?.name || 'חיית המחמד'}</h1>
                  <p className="text-[10px] text-muted-foreground">{(documents || []).length} מסמכים</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Scan Document Button — hero CTA */}
          <div className="px-4 pt-4 pb-2">
            <motion.button
              onClick={() => setScannerOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-l from-primary/15 via-primary/8 to-transparent border border-primary/20 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <Scan className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right flex-1">
                <p className="text-sm font-bold text-foreground">סריקת מסמך</p>
                <p className="text-[10px] text-muted-foreground">צלם מסמך — המדען יחלץ את הנתונים אוטומטית</p>
              </div>
              <Sparkles className="w-4 h-4 text-primary/60" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-2 pb-20 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              groupedDocs.map((group, gi) => {
                const Icon = group.icon;
                const isExpanded = expandedCategory === group.id;
                const [iconColor, iconBg] = group.color.split(' ');

                return (
                  <motion.div
                    key={group.id}
                    className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.05 }}
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : group.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground">{group.label}</span>
                          <span className="text-[10px] text-muted-foreground mr-2">
                            ({group.docs.length})
                          </span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {/* Upload */}
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => handleFileUpload(e, group.id)}
                                disabled={isUploading}
                              />
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-primary" />
                                  <span className="text-xs text-primary font-medium">העלאת מסמך</span>
                                </>
                              )}
                            </label>

                            {/* Documents */}
                            {group.docs.length > 0 ? (
                              group.docs.map((doc: any) => {
                                const isVerified = verifiedDocIds.has(doc.id);
                                const isImage = doc.document_type?.startsWith('image/');

                                return (
                                  <motion.div
                                    key={doc.id}
                                    className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/10 backdrop-blur-sm"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                  >
                                    {/* Thumbnail */}
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${isImage ? '' : `${iconBg} flex items-center justify-center`}`}>
                                      {isImage ? (
                                        <img
                                          src={doc.document_url}
                                          alt={doc.document_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <FileText className={`w-5 h-5 ${iconColor}`} />
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {doc.document_name}
                                      </p>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span>{formatFileSize(doc.file_size || 0)}</span>
                                        <span>•</span>
                                        <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                                      </div>
                                      {/* Verification Badge */}
                                      {isVerified && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          <span className="text-[9px] font-medium text-emerald-600">אומת על ידי המדען</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        onClick={() => handleView(doc.document_url)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                                        aria-label="צפייה"
                                      >
                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={() => handleShare(doc)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                                        aria-label="שיתוף"
                                      >
                                        <Share2 className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={() => deleteMutation.mutate(doc.id)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                                        aria-label="מחיקה"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-3">
                                אין מסמכים בקטגוריה זו
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* ═══ Scanner Overlay ═══ */}
          <AnimatePresence>
            {scannerOpen && (
              <motion.div
                className="fixed inset-0 z-[350] bg-black flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Scanner Header */}
                <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,12px)] h-16">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setScannerOpen(false); setScanPreview(null); setIsScanning(false); }}
                    className="text-white/80 text-sm font-medium"
                  >
                    ביטול
                  </motion.button>
                  <h2 className="text-white font-bold text-sm">סריקת מסמך</h2>
                  <div className="w-10" />
                </div>

                {/* Preview / Viewfinder */}
                <div className="flex-1 flex items-center justify-center px-6">
                  {isScanning ? (
                    <motion.div className="flex flex-col items-center gap-4">
                      {scanPreview && (
                        <motion.div
                          className="w-64 h-80 rounded-2xl overflow-hidden border-2 border-primary/40"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                        >
                          <img src={scanPreview} alt="preview" className="w-full h-full object-cover" />
                        </motion.div>
                      )}
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-5 h-5 text-primary" />
                        </motion.div>
                        <p className="text-white/80 text-sm font-medium">המדען מנתח את המסמך...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      {/* Auto-crop frame */}
                      <div className="relative w-72 h-96 rounded-2xl border-2 border-white/20 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileText className="w-16 h-16 text-white/10" />
                        </div>
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                        {/* Scan line animation */}
                        <motion.div
                          className="absolute left-2 right-2 h-0.5 bg-primary/60"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                      <p className="text-white/50 text-xs text-center">
                        מקם את המסמך בתוך המסגרת
                      </p>
                    </div>
                  )}
                </div>

                {/* Scanner Controls */}
                {!isScanning && (
                  <div className="pb-[env(safe-area-inset-bottom,24px)] px-8 py-6 flex items-center justify-center gap-8">
                    {/* Gallery */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (galleryInputRef.current) {
                          galleryInputRef.current.click();
                        }
                      }}
                      className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
                    >
                      <Upload className="w-5 h-5 text-white/80" />
                    </motion.button>

                    {/* Camera Shutter */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-18 h-18 rounded-full border-4 border-white/80 flex items-center justify-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                        <Camera className="w-6 h-6 text-black" />
                      </div>
                    </motion.button>

                    {/* Spacer */}
                    <div className="w-12" />
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleScanCapture}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleScanCapture}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
