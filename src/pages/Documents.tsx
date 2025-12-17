import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Search, X, ArrowUpDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SwipeableDocumentCard } from "@/components/SwipeableDocumentCard";

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
  const [pets, setPets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; fileUrl: string; doc: any } | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Upload form state
  const [uploadPetId, setUploadPetId] = useState<string>("");
  const [uploadDocType, setUploadDocType] = useState<string>("vaccination");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchPets();
    fetchDocuments();
  }, []);

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

      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("pet-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("pet-documents")
        .getPublicUrl(fileName);

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from("pet_documents")
        .insert({
          user_id: user.id,
          pet_id: uploadPetId,
          document_type: uploadDocType,
          title: uploadTitle,
          description: uploadDescription || null,
          file_url: publicUrl,
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
            className="px-3 py-1.5 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
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
        return "מסמך רפואי";
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
      
      <div className="min-h-screen bg-[#F6F6F6] pb-28">
        <div className="container mx-auto px-4 pt-4 pb-6 max-w-lg">
          {/* Header Section */}
          <div className="mb-5 text-center">
            <div className="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px] shadow-lg shadow-[#DD2A7B]/20">
              <div className="w-full h-full rounded-[12px] bg-white flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#DD2A7B]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800">המסמכים שלי</h2>
            <p className="text-gray-500 text-xs mt-0.5">ניהול אישורי חיסון ומסמכים רפואיים</p>
          </div>

          {/* Search Input - Separate */}
          <div className="relative mb-3">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש מסמך..."
              className="h-11 pr-10 pl-10 rounded-xl bg-white border-0 shadow-sm text-sm placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            )}
          </div>

          {/* Filters & Sort - Compact Row */}
          <div className="flex gap-2 mb-4">
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger className="h-9 rounded-lg bg-white border-0 shadow-sm text-xs flex-1">
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

            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="h-9 rounded-lg bg-white border-0 shadow-sm text-xs flex-1">
                <SelectValue placeholder="סוג" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="vaccination">💉 חיסון</SelectItem>
                <SelectItem value="medical">🏥 רפואי</SelectItem>
                <SelectItem value="other">📄 אחר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 rounded-lg bg-white border-0 shadow-sm text-xs w-[100px]">
                <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-gray-500" />
                <span className="text-gray-600">מיון</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">חדש → ישן</SelectItem>
                <SelectItem value="date-asc">ישן → חדש</SelectItem>
                <SelectItem value="name-asc">א → ת</SelectItem>
                <SelectItem value="name-desc">ת → א</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-white rounded-3xl">
              {/* Instagram-style gradient header */}
              <div className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-5">
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
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <span>🐾</span> חיית מחמד
                  </Label>
                  <Select value={uploadPetId} onValueChange={setUploadPetId}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
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
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <span>📄</span> סוג מסמך
                  </Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger className="h-12 rounded-xl border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vaccination">💉 אישור חיסון</SelectItem>
                      <SelectItem value="medical">🏥 מסמך רפואי</SelectItem>
                      <SelectItem value="other">📎 אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <span>✏️</span> כותרת
                  </Label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="לדוגמה: חיסון כלבת 2024"
                    className="h-12 rounded-xl border-gray-200"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">תיאור (אופציונלי)</Label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="הוסף פרטים נוספים..."
                    rows={2}
                    className="rounded-xl border-gray-200 resize-none"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <span>📁</span> קובץ
                  </Label>
                  <label
                    htmlFor="upload-file"
                    className={`
                      relative flex flex-col items-center justify-center w-full h-28 
                      border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
                      ${selectedFile 
                        ? 'border-[#DD2A7B] bg-gradient-to-br from-[#DD2A7B]/5 to-[#8134AF]/5' 
                        : 'border-gray-300 hover:border-[#DD2A7B] hover:bg-gray-50'
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
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center mb-2 animate-scale-in">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate max-w-full">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#DD2A7B]/10 flex items-center justify-center mb-2 transition-all duration-300">
                          <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#DD2A7B] transition-colors" />
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="text-[#DD2A7B] font-medium">לחץ לבחירה</span> או גרור קובץ
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC (עד 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !uploadPetId || !uploadTitle}
                  className={`
                    w-full h-12 rounded-xl font-bold text-white text-base transition-all duration-300
                    ${uploading || !selectedFile || !uploadPetId || !uploadTitle
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#DD2A7B]/25'
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px] animate-spin">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#DD2A7B]" />
                </div>
              </div>
              <p className="mt-3 text-gray-500 text-xs">טוען מסמכים...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">אין מסמכים</h3>
              <p className="text-gray-500 text-xs text-center max-w-[200px] mb-4">
                {documents.length === 0
                  ? "העלה את המסמכים של חיית המחמד שלך"
                  : "לא נמצאו מסמכים התואמים לסינון"}
              </p>
              {documents.length === 0 && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white rounded-lg px-5 h-9 text-sm font-medium hover:opacity-90"
                >
                  <Upload className="w-4 h-4 ml-1.5" />
                  העלה מסמך
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-medium text-gray-600">
                  {filteredDocuments.length} מסמכים
                </span>
                <span className="text-[10px] text-gray-400">החלק שמאלה למחיקה</span>
              </div>
              {filteredDocuments.map((doc, index) => (
                <SwipeableDocumentCard
                  key={doc.id}
                  doc={doc}
                  petName={getPetName(doc.pet_id)}
                  documentTypeLabel={getDocumentTypeLabel(doc.document_type)}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
