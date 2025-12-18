import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Heart, Camera, Upload, X, Check, XCircle, Mail, Phone, MapPin, FileText, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";

interface AdoptionRequest {
  id: string;
  pet_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  reason: string;
  has_experience: boolean | null;
  experience_details: string | null;
  has_other_pets: boolean | null;
  other_pets_details: string | null;
  status: string | null;
  created_at: string | null;
  pet?: {
    name: string;
    type: string;
    breed: string | null;
    image_url: string | null;
  };
}

interface AdoptionPet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age_years: number | null;
  age_months: number | null;
  gender: string | null;
  size: string;
  description: string | null;
  image_url: string | null;
  is_vaccinated: boolean | null;
  is_neutered: boolean | null;
  special_needs: string | null;
  status: string | null;
}

const AdminAdoption = () => {
  const [pets, setPets] = useState<AdoptionPet[]>([]);
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [editingPet, setEditingPet] = useState<AdoptionPet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AdoptionRequest | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pets");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchPets();
      fetchRequests();
    }
  }, [adminLoading, isAdmin]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("adoption_pets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error("Error fetching adoption pets:", error);
      toast({
        title: "שגיאה בטעינת חיות לאימוץ",
        description: "לא הצלחנו לטעון את רשימת החיות.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const { data, error } = await supabase
        .from("adoption_requests")
        .select(`
          *,
          pet:adoption_pets(name, type, breed, image_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching adoption requests:", error);
      toast({
        title: "שגיאה בטעינת בקשות אימוץ",
        variant: "destructive",
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestStatusChange = async (requestId: string, newStatus: string, petId: string) => {
    try {
      // Find the request to get user_id and pet name
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update request status
      const { error: requestError } = await supabase
        .from("adoption_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // If approved, update pet status
      if (newStatus === "approved") {
        const { error: petError } = await supabase
          .from("adoption_pets")
          .update({ status: "adopted" })
          .eq("id", petId);

        if (petError) throw petError;
        fetchPets();
      }

      // Send notification to the requester
      const petName = request.pet?.name || "החיה";
      const notificationTitle = newStatus === "approved" 
        ? "🎉 בקשת האימוץ אושרה!" 
        : "בקשת האימוץ נדחתה";
      const notificationMessage = newStatus === "approved"
        ? `מזל טוב! בקשתך לאמץ את ${petName} אושרה. ניצור איתך קשר בהקדם לתיאום המשך התהליך.`
        : `לצערנו, בקשתך לאמץ את ${petName} לא אושרה. אל תתייאש, יש עוד הרבה חיות שמחכות לבית חם!`;

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: request.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "adoption",
          is_read: false,
        });

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      toast({
        title: newStatus === "approved" ? "הבקשה אושרה!" : "הבקשה נדחתה",
        description: "המבקש יקבל התראה על עדכון הסטטוס",
      });

      fetchRequests();
      setIsRequestDialogOpen(false);
    } catch (error) {
      console.error("Error updating request status:", error);
      toast({
        title: "שגיאה בעדכון הבקשה",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `adoption-${Date.now()}.${fileExt}`;
      const filePath = `adoption/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (editingPet) {
        setEditingPet({ ...editingPet, image_url: publicUrl });
      }

      toast({ title: "התמונה הועלתה בהצלחה" });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "שגיאה בהעלאת התמונה",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPet) return;

    try {
      const petData = {
        name: editingPet.name,
        type: editingPet.type,
        breed: editingPet.breed,
        age_years: editingPet.age_years,
        age_months: editingPet.age_months,
        gender: editingPet.gender,
        size: editingPet.size,
        description: editingPet.description,
        image_url: editingPet.image_url,
        is_vaccinated: editingPet.is_vaccinated,
        is_neutered: editingPet.is_neutered,
        special_needs: editingPet.special_needs,
        status: editingPet.status,
      };

      const { error } = editingPet.id
        ? await supabase
            .from("adoption_pets")
            .update(petData)
            .eq("id", editingPet.id)
        : await supabase.from("adoption_pets").insert([petData]);

      if (error) throw error;

      toast({
        title: editingPet.id ? "החיה עודכנה בהצלחה" : "החיה נוספה בהצלחה",
      });

      setIsDialogOpen(false);
      setEditingPet(null);
      setPreviewImage(null);
      fetchPets();
    } catch (error) {
      console.error("Error saving pet:", error);
      toast({
        title: "שגיאה בשמירת החיה",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את החיה?")) return;

    try {
      const { error } = await supabase.from("adoption_pets").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "החיה נמחקה בהצלחה",
      });

      fetchPets();
    } catch (error) {
      console.error("Error deleting pet:", error);
      toast({
        title: "שגיאה במחיקת החיה",
        variant: "destructive",
      });
    }
  };

  const openNewPetDialog = () => {
    setEditingPet({
      id: "",
      name: "",
      type: "dog",
      breed: null,
      age_years: null,
      age_months: null,
      gender: null,
      size: "medium",
      description: null,
      image_url: null,
      is_vaccinated: false,
      is_neutered: false,
      special_needs: null,
      status: "available",
    });
    setPreviewImage(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (pet: AdoptionPet) => {
    setEditingPet(pet);
    setPreviewImage(pet.image_url);
    setIsDialogOpen(true);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">אין לך הרשאות גישה לדף זה</p>
        </div>
      </div>
    );
  }

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-black mb-6">ניהול אימוץ</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-petid-blue data-[state=active]:via-petid-gold data-[state=active]:to-petid-blue data-[state=active]:text-white">
              חיות לאימוץ ({pets.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-petid-blue data-[state=active]:via-petid-gold data-[state=active]:to-petid-blue data-[state=active]:text-white relative">
              בקשות אימוץ ({requests.length})
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Pets Tab */}
          <TabsContent value="pets">
            <div className="flex items-center justify-end mb-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewPetDialog} className="bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue hover:opacity-90 text-white">
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף חיה
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-black">
                      {editingPet?.id ? "עריכת חיה" : "הוספת חיה חדשה לאימוץ"}
                    </DialogTitle>
                  </DialogHeader>
                  {editingPet && (
                    <form onSubmit={handleSave} className="space-y-4">
                      {/* Image Upload Section */}
                      <div className="flex flex-col items-center gap-4">
                        <div 
                          className="relative w-40 h-40 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#DD2A7B] transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {previewImage ? (
                            <>
                              <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(null);
                                  if (editingPet) setEditingPet({ ...editingPet, image_url: null });
                                }}
                                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center">
                              {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD2A7B]"></div>
                              ) : (
                                <>
                                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">העלה תמונה</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="text-black">שם החיה *</Label>
                          <Input
                            id="name"
                            value={editingPet.name}
                            onChange={(e) => setEditingPet({ ...editingPet, name: e.target.value })}
                            required
                            className="bg-gray-50 border-gray-200 text-black"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type" className="text-black">סוג *</Label>
                          <Select value={editingPet.type} onValueChange={(value) => setEditingPet({ ...editingPet, type: value })}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dog">כלב</SelectItem>
                              <SelectItem value="cat">חתול</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="breed" className="text-black">גזע</Label>
                          <Input
                            id="breed"
                            value={editingPet.breed || ""}
                            onChange={(e) => setEditingPet({ ...editingPet, breed: e.target.value })}
                            className="bg-gray-50 border-gray-200 text-black"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gender" className="text-black">מין</Label>
                          <Select value={editingPet.gender || ""} onValueChange={(value) => setEditingPet({ ...editingPet, gender: value })}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                              <SelectValue placeholder="בחר מין" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">זכר</SelectItem>
                              <SelectItem value="female">נקבה</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="age_years" className="text-black">גיל (שנים)</Label>
                          <Input
                            id="age_years"
                            type="number"
                            min="0"
                            value={editingPet.age_years || ""}
                            onChange={(e) => setEditingPet({ ...editingPet, age_years: e.target.value ? parseInt(e.target.value) : null })}
                            className="bg-gray-50 border-gray-200 text-black"
                          />
                        </div>
                        <div>
                          <Label htmlFor="age_months" className="text-black">גיל (חודשים)</Label>
                          <Input
                            id="age_months"
                            type="number"
                            min="0"
                            max="11"
                            value={editingPet.age_months || ""}
                            onChange={(e) => setEditingPet({ ...editingPet, age_months: e.target.value ? parseInt(e.target.value) : null })}
                            className="bg-gray-50 border-gray-200 text-black"
                          />
                        </div>
                        <div>
                          <Label htmlFor="size" className="text-black">גודל *</Label>
                          <Select value={editingPet.size} onValueChange={(value) => setEditingPet({ ...editingPet, size: value })}>
                            <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">קטן</SelectItem>
                              <SelectItem value="medium">בינוני</SelectItem>
                              <SelectItem value="large">גדול</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-black">תיאור</Label>
                        <Textarea
                          id="description"
                          value={editingPet.description || ""}
                          onChange={(e) => setEditingPet({ ...editingPet, description: e.target.value })}
                          className="bg-gray-50 border-gray-200 text-black"
                          rows={3}
                          placeholder="ספר על החיה, אופי, התנהגות..."
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-black">מידע נוסף</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingPet.is_vaccinated || false}
                              onCheckedChange={(checked) => setEditingPet({ ...editingPet, is_vaccinated: checked })}
                            />
                            <Label className="text-black">מחוסן</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingPet.is_neutered || false}
                              onCheckedChange={(checked) => setEditingPet({ ...editingPet, is_neutered: checked })}
                            />
                            <Label className="text-black">מסורס/מעוקר</Label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="special_needs" className="text-black">צרכים מיוחדים</Label>
                        <Textarea
                          id="special_needs"
                          value={editingPet.special_needs || ""}
                          onChange={(e) => setEditingPet({ ...editingPet, special_needs: e.target.value })}
                          className="bg-gray-50 border-gray-200 text-black"
                          rows={2}
                          placeholder="בעיות בריאות, תזונה מיוחדת..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="status" className="text-black">סטטוס</Label>
                        <Select value={editingPet.status || "available"} onValueChange={(value) => setEditingPet({ ...editingPet, status: value })}>
                          <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">זמין לאימוץ</SelectItem>
                            <SelectItem value="pending">בתהליך אימוץ</SelectItem>
                            <SelectItem value="adopted">אומץ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1 bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue hover:opacity-90 text-white">
                          שמור
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 border-gray-200 text-black hover:bg-gray-100"
                        >
                          ביטול
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD2A7B]"></div>
                  <p className="text-gray-500 mt-2">טוען חיות לאימוץ...</p>
                </div>
              ) : pets.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">אין עדיין חיות לאימוץ</p>
                  <p className="text-sm text-gray-400">לחץ על "הוסף חיה" להתחיל</p>
                </div>
              ) : (
                pets.map((pet) => (
                  <Card key={pet.id} className="p-5 bg-gray-50 border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                        {pet.image_url ? (
                          <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-black">{pet.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pet.status === 'available' ? 'bg-green-100 text-green-700' :
                            pet.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {pet.status === 'available' ? 'זמין' :
                             pet.status === 'pending' ? 'בתהליך' : 'אומץ'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {pet.type === 'dog' ? 'כלב' : 'חתול'} • {pet.breed || 'גזע לא ידוע'} • 
                          {pet.gender === 'male' ? ' זכר' : pet.gender === 'female' ? ' נקבה' : ''} •
                          {pet.size === 'small' ? ' קטן' : pet.size === 'medium' ? ' בינוני' : ' גדול'}
                        </p>
                        {pet.age_years || pet.age_months ? (
                          <p className="text-sm text-gray-500">
                            גיל: {pet.age_years ? `${pet.age_years} שנים` : ''} {pet.age_months ? `${pet.age_months} חודשים` : ''}
                          </p>
                        ) : null}
                        <div className="flex gap-1 mt-2">
                          {pet.is_vaccinated && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">מחוסן</span>
                          )}
                          {pet.is_neutered && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">מסורס</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(pet)}
                          className="border-gray-200 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(pet.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              {requestsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#DD2A7B]"></div>
                  <p className="text-gray-500 mt-2">טוען בקשות אימוץ...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">אין עדיין בקשות אימוץ</p>
                </div>
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className="p-5 bg-gray-50 border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                        {request.pet?.image_url ? (
                          <img src={request.pet.image_url} alt={request.pet?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-black">{request.full_name}</h3>
                          <Badge variant={
                            request.status === 'pending' ? 'secondary' :
                            request.status === 'approved' ? 'default' : 'destructive'
                          } className={
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }>
                            {request.status === 'pending' ? 'ממתין' :
                             request.status === 'approved' ? 'אושר' : 'נדחה'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          מבקש לאמץ: <span className="font-medium">{request.pet?.name}</span> ({request.pet?.type === 'dog' ? 'כלב' : 'חתול'})
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {request.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {request.phone}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.created_at || '').toLocaleDateString('he-IL')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsRequestDialogOpen(true);
                          }}
                          className="border-gray-200 hover:bg-gray-100"
                        >
                          פרטים
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleRequestStatusChange(request.id, 'approved', request.pet_id)}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestStatusChange(request.id, 'rejected', request.pet_id)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Request Details Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="text-black">פרטי בקשת אימוץ</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200">
                    {selectedRequest.pet?.image_url ? (
                      <img src={selectedRequest.pet.image_url} alt={selectedRequest.pet?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-black">{selectedRequest.pet?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.pet?.type === 'dog' ? 'כלב' : 'חתול'} • {selectedRequest.pet?.breed || 'גזע לא ידוע'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-500 text-xs">שם מלא</Label>
                    <p className="text-black font-medium">{selectedRequest.full_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-500 text-xs">אימייל</Label>
                      <p className="text-black text-sm">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">טלפון</Label>
                      <p className="text-black text-sm">{selectedRequest.phone}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-xs">כתובת</Label>
                    <p className="text-black text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedRequest.address}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-500 text-xs">סיבת הבקשה</Label>
                    <p className="text-black text-sm bg-gray-50 p-3 rounded-lg">{selectedRequest.reason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-500 text-xs">ניסיון עם חיות</Label>
                      <p className="text-black text-sm">{selectedRequest.has_experience ? 'כן' : 'לא'}</p>
                      {selectedRequest.experience_details && (
                        <p className="text-gray-600 text-xs mt-1">{selectedRequest.experience_details}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">חיות נוספות בבית</Label>
                      <p className="text-black text-sm">{selectedRequest.has_other_pets ? 'כן' : 'לא'}</p>
                      {selectedRequest.other_pets_details && (
                        <p className="text-gray-600 text-xs mt-1">{selectedRequest.other_pets_details}</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleRequestStatusChange(selectedRequest.id, 'approved', selectedRequest.pet_id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      אשר בקשה
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRequestStatusChange(selectedRequest.id, 'rejected', selectedRequest.pet_id)}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      דחה בקשה
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAdoption;
