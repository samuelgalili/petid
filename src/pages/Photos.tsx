import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Pet {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  pet_id: string | null;
  created_at: string;
  pets?: {
    name: string;
  };
}

export default function Photos() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPetFilter, setSelectedPetFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchPhotos();
    }
  }, [user]);

  const fetchPets = async () => {
    const { data, error } = await supabase
      .from("pets")
      .select("id, name, avatar_url")
      .eq("user_id", user?.id)
      .eq("archived", false);

    if (error) {
      toast.error("שגיאה בטעינת חיות המחמד");
      return;
    }

    setPets(data || []);
  };

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("pet_photos")
      .select(`
        id,
        photo_url,
        caption,
        pet_id,
        created_at,
        pets:pet_id (name)
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת התמונות");
      return;
    }

    setPhotos(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("יש להעלות קובץ תמונה בלבד");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל הקובץ לא יכול לעבור 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("pet-photos")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("pet-photos")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("pet_photos")
        .insert({
          user_id: user.id,
          pet_id: selectedPet || null,
          photo_url: publicUrl,
          caption: caption || null,
        });

      if (dbError) throw dbError;

      toast.success("התמונה הועלתה בהצלחה!");
      setUploadDialogOpen(false);
      resetUploadForm();
      fetchPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    try {
      // Delete from storage
      const filePath = photo.photo_url.split("/pet-photos/")[1];
      if (filePath) {
        await supabase.storage.from("pet-photos").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("pet_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      toast.success("התמונה נמחקה בהצלחה");
      fetchPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("שגיאה במחיקת התמונה");
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedPet("");
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const filteredPhotos = selectedPetFilter === "all"
    ? photos
    : photos.filter(photo => photo.pet_id === selectedPetFilter);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">אלבום התמונות</h1>
            
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900">
                  <Upload className="ml-2 h-4 w-4" />
                  העלאת תמונה
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>העלאת תמונה חדשה</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Preview */}
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2"
                        onClick={resetUploadForm}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="ml-2 h-4 w-4" />
                          בחר קובץ
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera className="ml-2 h-4 w-4" />
                          צלם תמונה
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  )}

                  {/* Pet Selection */}
                  <div className="space-y-2">
                    <Label>חיית מחמד (אופציונלי)</Label>
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר חיית מחמד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ללא חיית מחמד</SelectItem>
                        {pets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Caption */}
                  <div className="space-y-2">
                    <Label>כיתוב (אופציונלי)</Label>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="הוסף כיתוב לתמונה..."
                      rows={3}
                    />
                  </div>

                  <Button
                    className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900"
                    onClick={uploadPhoto}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? "מעלה..." : "העלאת תמונה"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedPetFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPetFilter("all")}
              className={selectedPetFilter === "all" ? "bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900" : ""}
            >
              הכל ({photos.length})
            </Button>
            {pets.map((pet) => {
              const petPhotoCount = photos.filter(p => p.pet_id === pet.id).length;
              return (
                <Button
                  key={pet.id}
                  variant={selectedPetFilter === pet.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPetFilter(pet.id)}
                  className={selectedPetFilter === pet.id ? "bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900" : ""}
                >
                  {pet.name} ({petPhotoCount})
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              אין תמונות עדיין
            </h3>
            <p className="text-gray-600 mb-4">
              העלה את התמונה הראשונה של חיית המחמד שלך
            </p>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900"
            >
              <Upload className="ml-2 h-4 w-4" />
              העלאת תמונה
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || "Pet photo"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {photo.pets && (
                      <p className="text-white text-sm font-medium mb-1">
                        {photo.pets.name}
                      </p>
                    )}
                    {photo.caption && (
                      <p className="text-white text-xs line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 left-2"
                    onClick={() => deletePhoto(photo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
