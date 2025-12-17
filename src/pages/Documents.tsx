import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Download } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

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

    if (selectedPetId !== "all") {
      filtered = filtered.filter((doc) => doc.pet_id === selectedPetId);
    }

    if (selectedDocType !== "all") {
      filtered = filtered.filter((doc) => doc.document_type === selectedDocType);
    }

    setFilteredDocuments(filtered);
  }, [selectedPetId, selectedDocType, documents]);

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
    if (!confirm("האם אתה בטוח שברצונך למחוק מסמך זה?")) return;

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

      toast({
        title: "הצלחה!",
        description: "המסמך נמחק בהצלחה",
      });

      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המסמך",
        variant: "destructive",
      });
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
      
      <div className="min-h-screen bg-white pb-20">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <p className="text-gray-600">ניהול אישורי חיסון ומסמכים רפואיים</p>
          </div>

        {/* Filters and Upload Button */}
        <div className="bg-white border border-border rounded-lg p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="pet-filter">חיית מחמד</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger id="pet-filter">
                    <SelectValue placeholder="בחר חיית מחמד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל חיות המחמד</SelectItem>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="type-filter">סוג מסמך</Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    <SelectItem value="vaccination">אישור חיסון</SelectItem>
                    <SelectItem value="medical">מסמך רפואי</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg font-jakarta">
                    <Upload className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    העלה מסמך
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-white">
                  {/* Instagram-style gradient header */}
                  <div className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-white font-bold text-lg font-jakarta">העלאת מסמך חדש</h2>
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mt-1">שמור את המסמכים החשובים של חיית המחמד שלך</p>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {/* Pet Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="upload-pet" className="text-gray-700 font-medium flex items-center gap-1">
                        <span className="text-[#DD2A7B]">🐾</span> חיית מחמד
                      </Label>
                      <Select value={uploadPetId} onValueChange={setUploadPetId}>
                        <SelectTrigger id="upload-pet" className="h-12 rounded-xl border-gray-200 focus:border-[#DD2A7B] focus:ring-[#DD2A7B]/20">
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
                      <Label htmlFor="upload-type" className="text-gray-700 font-medium flex items-center gap-1">
                        <span className="text-[#8134AF]">📄</span> סוג מסמך
                      </Label>
                      <Select value={uploadDocType} onValueChange={setUploadDocType}>
                        <SelectTrigger id="upload-type" className="h-12 rounded-xl border-gray-200 focus:border-[#8134AF] focus:ring-[#8134AF]/20">
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
                      <Label htmlFor="upload-title" className="text-gray-700 font-medium flex items-center gap-1">
                        <span className="text-[#F58529]">✏️</span> כותרת
                      </Label>
                      <Input
                        id="upload-title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="לדוגמה: חיסון כלבת 2024"
                        className="h-12 rounded-xl border-gray-200 focus:border-[#F58529] focus:ring-[#F58529]/20"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="upload-description" className="text-gray-700 font-medium">תיאור (אופציונלי)</Label>
                      <Textarea
                        id="upload-description"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="הוסף פרטים נוספים..."
                        rows={2}
                        className="rounded-xl border-gray-200 focus:border-[#DD2A7B] focus:ring-[#DD2A7B]/20 resize-none"
                      />
                    </div>

                    {/* File Upload - Instagram Style */}
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium flex items-center gap-1">
                        <span className="text-[#DD2A7B]">📁</span> קובץ
                      </Label>
                      <label
                        htmlFor="upload-file"
                        className={`
                          relative flex flex-col items-center justify-center w-full h-28 
                          border-2 border-dashed rounded-2xl cursor-pointer
                          transition-all duration-300 group
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
                            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gradient-to-r group-hover:from-[#F58529]/20 group-hover:via-[#DD2A7B]/20 group-hover:to-[#8134AF]/20 flex items-center justify-center mb-2 transition-all duration-300">
                              <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#DD2A7B] transition-colors" />
                            </div>
                            <p className="text-sm text-gray-600">גרור קובץ לכאן או <span className="text-[#DD2A7B] font-medium">לחץ לבחירה</span></p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC (עד 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Submit Button - Instagram Gradient */}
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !selectedFile || !uploadPetId || !uploadTitle}
                      className={`
                        w-full h-12 rounded-xl font-bold text-white text-base
                        transition-all duration-300 transform
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
            </div>
          </div>
        </div>

        {/* Documents List - Instagram Style */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[3px] animate-spin">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#DD2A7B]" />
              </div>
            </div>
            <p className="mt-4 text-gray-500 text-sm">טוען מסמכים...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">אין מסמכים</h3>
            <p className="text-gray-500 text-center max-w-xs mb-6">
              {documents.length === 0
                ? "העלה את המסמכים החשובים של חיית המחמד שלך כמו אישורי חיסון ומסמכים רפואיים"
                : "לא נמצאו מסמכים התואמים לסינון שבחרת"}
            </p>
            {documents.length === 0 && (
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white rounded-xl px-6 py-3 font-medium hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4 ml-2" />
                העלה מסמך ראשון
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc, index) => {
              const getDocTypeGradient = (type: string) => {
                switch (type) {
                  case "vaccination": return "from-[#10B981] to-[#059669]";
                  case "medical": return "from-[#3B82F6] to-[#2563EB]";
                  default: return "from-[#8B5CF6] to-[#7C3AED]";
                }
              };
              
              const getDocTypeIcon = (type: string) => {
                switch (type) {
                  case "vaccination": return "💉";
                  case "medical": return "🏥";
                  default: return "📄";
                }
              };

              return (
                <div
                  key={doc.id}
                  className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animation: 'fade-in 0.4s ease-out forwards'
                  }}
                >
                  {/* Instagram-style gradient border on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="absolute inset-[2px] bg-white rounded-[14px]" />
                  
                  <div className="relative p-4">
                    <div className="flex items-start gap-4">
                      {/* Document Icon with gradient ring */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getDocTypeGradient(doc.document_type)} p-[2px] shadow-lg`}>
                          <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center">
                            <span className="text-2xl">{getDocTypeIcon(doc.document_type)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 group-hover:text-[#DD2A7B] transition-colors">
                              {doc.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getDocTypeGradient(doc.document_type)} text-white`}>
                                {getDocumentTypeLabel(doc.document_type)}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                🐾 {getPetName(doc.pet_id)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {doc.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#F58529] to-[#DD2A7B]" />
                            הועלה ב-{new Date(doc.uploaded_at).toLocaleDateString("he-IL")}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDownload(doc.file_url, doc.file_name)}
                              className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gradient-to-r hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] flex items-center justify-center transition-all duration-200 group/btn"
                            >
                              <Download className="w-4 h-4 text-gray-600 group-hover/btn:text-white transition-colors" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.file_url)}
                              className="w-9 h-9 rounded-full bg-gray-50 hover:bg-red-500 flex items-center justify-center transition-all duration-200 group/btn"
                            >
                              <Trash2 className="w-4 h-4 text-gray-600 group-hover/btn:text-white transition-colors" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
