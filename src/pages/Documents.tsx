import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Search, X, ArrowUpDown, Syringe, Stethoscope, File, Calendar, FolderOpen, Plus, Filter, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SwipeableDocumentCard } from "@/components/SwipeableDocumentCard";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";

interface PetDocument {
  id: string;
  user_id: string;
  pet_id: string;
  document_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  updated_at: string;
}

interface Pet {
  id: string;
  name: string;
}

export default function Documents() {
  const [searchParams] = useSearchParams();
  const preselectedPetId = searchParams.get('petId');
  const highlightDocId = searchParams.get('highlight');
  const [pets, setPets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>(preselectedPetId || "all");
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; fileUrl: string; doc: any } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Upload form state
  const [uploadPetId, setUploadPetId] = useState<string>(preselectedPetId || "");
  const [uploadDocType, setUploadDocType] = useState<string>("vaccination");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { toast } = useToast();

  // Document stats
  const documentStats = useMemo(() => {
    const vaccination = documents.filter(d => d.document_type === 'vaccination').length;
    const medical = documents.filter(d => d.document_type === 'medical').length;
    const other = documents.filter(d => d.document_type === 'other').length;
    return { vaccination, medical, other, total: documents.length };
  }, [documents]);

  useEffect(() => {
    fetchPets();
    fetchDocuments();
  }, []);

  // Auto-scroll to highlighted document from deep-link
  useEffect(() => {
    if (highlightDocId && !loading && filteredDocuments.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`doc-${highlightDocId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightDocId, loading, filteredDocuments]);

  useEffect(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) => 
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    if (selectedPetId !== "all") {
      filtered = filtered.filter((doc) => doc.pet_id === selectedPetId);
    }

    if (selectedDocType !== "all") {
      filtered = filtered.filter((doc) => doc.document_type === selectedDocType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case "date-asc":
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case "name-asc":
          return a.title.localeCompare(b.title, 'he');
        case "name-desc":
          return b.title.localeCompare(a.title, 'he');
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  }, [selectedPetId, selectedDocType, documents, searchQuery, sortBy]);

  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pets")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("archived", false);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching pets:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pet_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את המסמכים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "קובץ גדול מדי",
          description: "גודל הקובץ חייב להיות פחות מ-10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadPetId || !uploadTitle) {
      toast({
        title: "שדות חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Convert file to base64 data URL
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from("pet_documents")
        .insert({
          user_id: user.id,
          pet_id: uploadPetId,
          document_type: uploadDocType,
          title: uploadTitle,
          description: uploadDescription || null,
          file_url: fileUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        });

      if (dbError) throw dbError;

      toast({
        title: "הצלחה!",
        description: "המסמך הועלה בהצלחה",
      });

      // Reset form
      setUploadPetId("");
      setUploadDocType("vaccination");
      setUploadTitle("");
      setUploadDescription("");
      setSelectedFile(null);
      setIsDialogOpen(false);

      // Refresh documents
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להעלות את המסמך",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    // Find the document to delete
    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;

    // Clear any existing timeout
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }

    // Remove from UI immediately
    setDocuments(prev => prev.filter(d => d.id !== docId));
    setPendingDelete({ id: docId, fileUrl, doc: docToDelete });

    // Show undo toast
    toast({
      title: "🗑️ המסמך נמחק",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span>"{docToDelete.title}" נמחק</span>
          <button
            onClick={() => handleUndoDelete()}
            className="px-3 py-1.5 bg-gradient-to-r from-primary via-accent to-primary-light text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            ביטול
          </button>
        </div>
      ),
      duration: 5000,
    });

    // Set timeout for actual deletion
    deleteTimeoutRef.current = setTimeout(() => {
      performActualDelete(docId, fileUrl);
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;

    // Clear the timeout
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }

    // Restore the document
    setDocuments(prev => [pendingDelete.doc, ...prev]);
    setPendingDelete(null);

    toast({
      title: "↩️ המסמך שוחזר",
      description: "המסמך הוחזר בהצלחה",
    });
  };

  const performActualDelete = async (docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/pet-documents/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        await supabase.storage
          .from("pet-documents")
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("pet_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;
      
      setPendingDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      // Restore document on error
      if (pendingDelete?.doc) {
        setDocuments(prev => [pendingDelete.doc, ...prev]);
      }
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המסמך",
        variant: "destructive",
      });
      setPendingDelete(null);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להוריד את המסמך",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "vaccination":
        return "אישור חיסון";
      case "medical":
      case "medical_record":
        return "רשומה רפואית";
      case "insurance":
        return "ביטוח";
      case "legal_contract":
        return "חוזה/הסכם";
      case "prescription":
        return "מרשם";
      case "lab_results":
        return "בדיקות מעבדה";
      case "vet_report":
        return "דוח וטרינר";
      case "other":
        return "אחר";
      default:
        return type;
    }
  };

  const getPetName = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    return pet?.name || "לא ידוע";
  };

  return (
    <>
      <AppHeader 
        title="מסמכים" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={{
          icon: Upload,
          onClick: () => setIsDialogOpen(true)
        }}
      />
      
      <div className="min-h-screen bg-background pb-20" dir="rtl">
        <div className="container mx-auto px-4 pt-4 pb-6 max-w-lg">
          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-2 mb-5"
          >
            {[
              { type: 'all', icon: FolderOpen, count: documentStats.total, label: 'הכל', activeClass: 'ring-primary bg-primary/10' },
              { type: 'vaccination', icon: Syringe, count: documentStats.vaccination, label: 'חיסונים', activeClass: 'ring-emerald-500 bg-emerald-500/10' },
              { type: 'medical', icon: Stethoscope, count: documentStats.medical, label: 'רפואי', activeClass: 'ring-blue-500 bg-blue-500/10' },
              { type: 'other', icon: File, count: documentStats.other, label: 'אחר', activeClass: 'ring-muted-foreground bg-muted' },
            ].map(({ type, icon: Icon, count, label, activeClass }) => (
              <Card
                key={type}
                className={`p-3 text-center cursor-pointer transition-all duration-200 border-border/30 hover:scale-[1.03] active:scale-95 ${
                  selectedDocType === type ? `ring-2 ${activeClass}` : 'bg-card hover:bg-muted/40'
                }`}
                onClick={() => setSelectedDocType(selectedDocType === type && type !== 'all' ? 'all' : type)}
              >
                <Icon className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
              </Card>
            ))}
          </motion.div>

          {/* Search & Filter Row */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש מסמך..."
                className="h-11 pr-10 pl-10 rounded-xl bg-card border-0 shadow-sm text-sm placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 rounded-xl ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="flex gap-2 pt-1">
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger className="h-10 rounded-xl bg-card border-0 shadow-sm text-xs flex-1">
                      <SelectValue placeholder="חיה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל החיות</SelectItem>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          🐾 {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 rounded-xl bg-card border-0 shadow-sm text-xs flex-1">
                      <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
                      <span>מיון</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">חדש → ישן</SelectItem>
                      <SelectItem value="date-asc">ישן → חדש</SelectItem>
                      <SelectItem value="name-asc">א → ת</SelectItem>
                      <SelectItem value="name-desc">ת → א</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Upload Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm shadow-md transition-all gap-2"
            >
              <Plus className="w-4 h-4" />
              העלאת מסמך חדש
            </Button>
          </motion.div>

          {/* Upload Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-card rounded-3xl" dir="rtl">
              {/* Header with Gradient */}
              <div className="bg-gradient-to-r from-primary via-accent to-primary-light p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">העלאת מסמך חדש</h2>
                    <p className="text-white/80 text-sm mt-1">שמור את המסמכים החשובים</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Pet Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-2">
                    <span>🐾</span> חיית מחמד
                  </Label>
                  <Select value={uploadPetId} onValueChange={setUploadPetId}>
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue placeholder="בחר חיית מחמד" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Type */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-2">
                    <span>📄</span> סוג מסמך
                  </Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger className="h-12 rounded-xl border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vaccination">💉 אישור חיסון</SelectItem>
                      <SelectItem value="medical_record">🏥 רשומה רפואית</SelectItem>
                      <SelectItem value="vet_report">🩺 דוח וטרינר</SelectItem>
                      <SelectItem value="prescription">💊 מרשם</SelectItem>
                      <SelectItem value="lab_results">🔬 בדיקות מעבדה</SelectItem>
                      <SelectItem value="insurance">🛡️ ביטוח</SelectItem>
                      <SelectItem value="legal_contract">📋 חוזה/הסכם</SelectItem>
                      <SelectItem value="other">📎 אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-2">
                    <span>✏️</span> כותרת
                  </Label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="לדוגמה: חיסון כלבת 2024"
                    className="h-12 rounded-xl border-border"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">תיאור (אופציונלי)</Label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="הוסף פרטים נוספים..."
                    rows={2}
                    className="rounded-xl border-border resize-none"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium flex items-center gap-2">
                    <span>📁</span> קובץ
                  </Label>
                  <label
                    htmlFor="upload-file"
                    className={`
                      relative flex flex-col items-center justify-center w-full h-28 
                      border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
                      ${selectedFile 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/30 hover:border-primary hover:bg-muted'
                      }
                    `}
                  >
                    <input
                      id="upload-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-2 animate-scale-in">
                          <FileText className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate max-w-full">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-all duration-300">
                          <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-primary font-medium">לחץ לבחירה</span> או גרור קובץ
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">PDF, JPG, PNG, DOC (עד 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !uploadPetId || !uploadTitle}
                  className={`
                    w-full h-12 rounded-xl font-bold text-primary-foreground text-base transition-all duration-300
                    ${uploading || !selectedFile || !uploadPetId || !uploadTitle
                      ? 'bg-muted-foreground/30 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25'
                    }
                  `}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>מעלה...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>העלה מסמך</span>
                    </div>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Documents List */}
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent p-[3px] animate-spin">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="mt-4 text-muted-foreground text-sm">טוען מסמכים...</p>
            </motion.div>
          ) : filteredDocuments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-5">
                <FileText className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">אין מסמכים</h3>
              <p className="text-muted-foreground text-sm text-center max-w-[260px] mb-6">
                {documents.length === 0
                  ? "שמור את המסמכים החשובים של חיית המחמד שלך במקום אחד"
                  : "לא נמצאו מסמכים התואמים לחיפוש"}
              </p>
              {documents.length === 0 && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  variant="outline"
                  className="group relative rounded-full px-8 h-12 text-base font-bold bg-transparent border-2 border-transparent overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary))) border-box',
                  }}
                >
                  <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite] flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary group-hover:text-accent transition-colors" />
                    העלה מסמך ראשון
                  </span>
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <span className="text-sm font-medium text-foreground">
                  {filteredDocuments.length} מסמכים
                </span>
                <span className="text-xs text-muted-foreground">החלק שמאלה למחיקה</span>
              </div>
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    id={`doc-${doc.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={highlightDocId === doc.id ? 'ring-2 ring-primary rounded-2xl animate-pulse' : ''}
                  >
                    <SwipeableDocumentCard
                      doc={doc}
                      petName={getPetName(doc.pet_id)}
                      documentTypeLabel={getDocumentTypeLabel(doc.document_type)}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                      index={index}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
