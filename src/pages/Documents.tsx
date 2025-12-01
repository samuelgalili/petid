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
      
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <p className="text-gray-600">ניהול אישורי חיסון ומסמכים רפואיים</p>
          </div>

        {/* Filters and Upload Button */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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
                  <Button className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900">
                    <Upload className="ml-2 h-4 w-4" />
                    העלה מסמך
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>העלאת מסמך חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="upload-pet">חיית מחמד *</Label>
                      <Select value={uploadPetId} onValueChange={setUploadPetId}>
                        <SelectTrigger id="upload-pet">
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

                    <div>
                      <Label htmlFor="upload-type">סוג מסמך *</Label>
                      <Select value={uploadDocType} onValueChange={setUploadDocType}>
                        <SelectTrigger id="upload-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vaccination">אישור חיסון</SelectItem>
                          <SelectItem value="medical">מסמך רפואי</SelectItem>
                          <SelectItem value="other">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="upload-title">כותרת *</Label>
                      <Input
                        id="upload-title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="לדוגמה: חיסון כלבת 2024"
                      />
                    </div>

                    <div>
                      <Label htmlFor="upload-description">תיאור</Label>
                      <Textarea
                        id="upload-description"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="הוסף פרטים נוספים..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="upload-file">קובץ *</Label>
                      <Input
                        id="upload-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      {selectedFile && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          מעלה...
                        </>
                      ) : (
                        "העלה מסמך"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין מסמכים</h3>
            <p className="text-gray-600 mb-4">
              {documents.length === 0
                ? "התחל בהעלאת המסמכים הראשונים שלך"
                : "לא נמצאו מסמכים התואמים לסינון"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <FileText className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {getPetName(doc.pet_id)}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        הועלה ב-{new Date(doc.uploaded_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mr-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.file_url, doc.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
