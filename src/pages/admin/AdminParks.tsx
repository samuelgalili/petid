import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";

interface DogPark {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  status: string;
  size: string | null;
  fencing: boolean;
  water: boolean;
  shade: boolean;
  agility: boolean;
  parking: boolean;
  lighting: boolean;
  notes: string | null;
  source: string | null;
  verified: boolean;
  rating: number | null;
  total_reviews: number;
}

const AdminParks = () => {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPark, setEditingPark] = useState<DogPark | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchParks();
    }
  }, [adminLoading, isAdmin]);

  const fetchParks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dog_parks")
        .select("*")
        .order("city", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setParks(data || []);
    } catch (error) {
      console.error("Error fetching parks:", error);
      toast({
        title: "שגיאה בטעינת גינות",
        description: "לא הצלחנו לטעון את רשימת הגינות.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPark) return;

    try {
      const { error } = editingPark.id
        ? await supabase
            .from("dog_parks")
            .update({
              name: editingPark.name,
              city: editingPark.city,
              address: editingPark.address,
              latitude: editingPark.latitude,
              longitude: editingPark.longitude,
              google_maps_link: editingPark.google_maps_link,
              status: editingPark.status,
              size: editingPark.size,
              fencing: editingPark.fencing,
              water: editingPark.water,
              shade: editingPark.shade,
              agility: editingPark.agility,
              parking: editingPark.parking,
              lighting: editingPark.lighting,
              notes: editingPark.notes,
              source: editingPark.source,
              verified: editingPark.verified,
            })
            .eq("id", editingPark.id)
        : await supabase.from("dog_parks").insert([
            {
              name: editingPark.name,
              city: editingPark.city,
              address: editingPark.address,
              latitude: editingPark.latitude,
              longitude: editingPark.longitude,
              google_maps_link: editingPark.google_maps_link,
              status: editingPark.status,
              size: editingPark.size,
              fencing: editingPark.fencing,
              water: editingPark.water,
              shade: editingPark.shade,
              agility: editingPark.agility,
              parking: editingPark.parking,
              lighting: editingPark.lighting,
              notes: editingPark.notes,
              source: editingPark.source,
              verified: editingPark.verified,
            },
          ]);

      if (error) throw error;

      toast({
        title: editingPark.id ? "הגינה עודכנה בהצלחה" : "הגינה נוספה בהצלחה",
      });

      setIsDialogOpen(false);
      setEditingPark(null);
      fetchParks();
    } catch (error) {
      console.error("Error saving park:", error);
      toast({
        title: "שגיאה בשמירת הגינה",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הגינה?")) return;

    try {
      const { error } = await supabase.from("dog_parks").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "הגינה נמחקה בהצלחה",
      });

      fetchParks();
    } catch (error) {
      console.error("Error deleting park:", error);
      toast({
        title: "שגיאה במחיקת הגינה",
        variant: "destructive",
      });
    }
  };

  const openNewParkDialog = () => {
    setEditingPark({
      id: "",
      name: "",
      city: "",
      address: "",
      latitude: null,
      longitude: null,
      google_maps_link: null,
      status: "active",
      size: "medium",
      fencing: false,
      water: false,
      shade: false,
      agility: false,
      parking: false,
      lighting: false,
      notes: null,
      source: null,
      verified: false,
      rating: null,
      total_reviews: 0,
    });
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

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">ניהול גינות כלבים</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewParkDialog} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="w-4 h-4 ml-2" />
                הוסף גינה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="text-black">
                  {editingPark?.id ? "עריכת גינה" : "הוספת גינה חדשה"}
                </DialogTitle>
              </DialogHeader>
              {editingPark && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-black">שם הגינה *</Label>
                      <Input
                        id="name"
                        value={editingPark.name}
                        onChange={(e) => setEditingPark({ ...editingPark, name: e.target.value })}
                        required
                        className="bg-gray-50 border-gray-200 text-black"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-black">עיר *</Label>
                      <Input
                        id="city"
                        value={editingPark.city}
                        onChange={(e) => setEditingPark({ ...editingPark, city: e.target.value })}
                        required
                        className="bg-gray-50 border-gray-200 text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-black">כתובת *</Label>
                    <Input
                      id="address"
                      value={editingPark.address}
                      onChange={(e) => setEditingPark({ ...editingPark, address: e.target.value })}
                      required
                      className="bg-gray-50 border-gray-200 text-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude" className="text-black">קו רוחב</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={editingPark.latitude || ""}
                        onChange={(e) =>
                          setEditingPark({ ...editingPark, latitude: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        className="bg-gray-50 border-gray-200 text-black"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-black">קו אורך</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={editingPark.longitude || ""}
                        onChange={(e) =>
                          setEditingPark({ ...editingPark, longitude: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        className="bg-gray-50 border-gray-200 text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="google_maps_link" className="text-black">קישור גוגל מפות</Label>
                    <Input
                      id="google_maps_link"
                      type="url"
                      value={editingPark.google_maps_link || ""}
                      onChange={(e) => setEditingPark({ ...editingPark, google_maps_link: e.target.value })}
                      className="bg-gray-50 border-gray-200 text-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status" className="text-black">סטטוס *</Label>
                      <Select value={editingPark.status} onValueChange={(value) => setEditingPark({ ...editingPark, status: value })}>
                        <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">פעילה</SelectItem>
                          <SelectItem value="closed">סגורה</SelectItem>
                          <SelectItem value="maintenance">בשיפוץ</SelectItem>
                          <SelectItem value="unknown">לא ידוע</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="size" className="text-black">גודל</Label>
                      <Select value={editingPark.size || "medium"} onValueChange={(value) => setEditingPark({ ...editingPark, size: value })}>
                        <SelectTrigger className="bg-gray-50 border-gray-200 text-black">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">קטנה</SelectItem>
                          <SelectItem value="medium">בינונית</SelectItem>
                          <SelectItem value="large">גדולה</SelectItem>
                          <SelectItem value="unknown">לא ידוע</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-black">מתקנים</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.fencing}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, fencing: checked })}
                        />
                        <Label className="text-black">גדר</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.water}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, water: checked })}
                        />
                        <Label className="text-black">מים</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.shade}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, shade: checked })}
                        />
                        <Label className="text-black">צל</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.agility}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, agility: checked })}
                        />
                        <Label className="text-black">אג'יליטי</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.parking}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, parking: checked })}
                        />
                        <Label className="text-black">חניה</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingPark.lighting}
                          onCheckedChange={(checked) => setEditingPark({ ...editingPark, lighting: checked })}
                        />
                        <Label className="text-black">תאורה</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-black">הערות</Label>
                    <Textarea
                      id="notes"
                      value={editingPark.notes || ""}
                      onChange={(e) => setEditingPark({ ...editingPark, notes: e.target.value })}
                      className="bg-gray-50 border-gray-200 text-black"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="source" className="text-black">מקור המידע</Label>
                    <Input
                      id="source"
                      value={editingPark.source || ""}
                      onChange={(e) => setEditingPark({ ...editingPark, source: e.target.value })}
                      className="bg-gray-50 border-gray-200 text-black"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingPark.verified}
                      onCheckedChange={(checked) => setEditingPark({ ...editingPark, verified: checked })}
                    />
                    <Label className="text-black">מאומת</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white">
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
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              <p className="text-gray-500 mt-2">טוען גינות...</p>
            </div>
          ) : (
            parks.map((park) => (
              <Card key={park.id} className="p-5 bg-gray-50 border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-black">{park.name}</h3>
                      {park.verified && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{park.city} - {park.address}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                        {park.status === "active" ? "פעילה" : park.status === "closed" ? "סגורה" : park.status === "maintenance" ? "בשיפוץ" : "לא ידוע"}
                      </span>
                      {park.size && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                          {park.size === "small" ? "קטנה" : park.size === "medium" ? "בינונית" : "גדולה"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPark(park);
                        setIsDialogOpen(true);
                      }}
                      className="border-gray-200 text-black hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(park.id)}
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
      </div>
    </div>
  );
};

export default AdminParks;