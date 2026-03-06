import { useState } from "react";
import { Upload, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  supplierId: string;
  onSubmitted: () => void;
}

export const FactoryProductUpload = ({ supplierId, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "food", price: "", cost_price: "",
    min_order_qty: "100", pet_type: "dog", life_stage: "adult",
    weight_kg: "", kcal_per_kg: "", ingredients: "",
  });

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.price) {
      toast({ title: "Missing fields", description: "Product name and price are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("factory_product_submissions").insert({
        supplier_id: supplierId, name: form.name, description: form.description || null,
        category: form.category, price: parseFloat(form.price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        min_order_qty: parseInt(form.min_order_qty) || 100, pet_type: form.pet_type,
        life_stage: form.life_stage, weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        kcal_per_kg: form.kcal_per_kg ? parseFloat(form.kcal_per_kg) : null,
        ingredients: form.ingredients || null, status: "pending_review",
      });
      if (error) throw error;
      toast({ title: "Product submitted!", description: "Your product is now pending admin review." });
      setForm({ name: "", description: "", category: "food", price: "", cost_price: "", min_order_qty: "100", pet_type: "dog", life_stage: "adult", weight_kg: "", kcal_per_kg: "", ingredients: "" });
      setOpen(false);
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Submit New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Upload className="w-5 h-5 text-primary" strokeWidth={1.5} /> Submit Product for Review
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2">
            <Label className="text-sm">Product Name *</Label>
            <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Premium Dog Food" />
          </div>
          <div className="col-span-2">
            <Label className="text-sm">Description</Label>
            <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Product description..." className="min-h-[80px]" />
          </div>
          <div>
            <Label className="text-sm">Category</Label>
            <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="treats">Treats</SelectItem>
                <SelectItem value="supplements">Supplements</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="grooming">Grooming</SelectItem>
                <SelectItem value="toys">Toys</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Pet Type</Label>
            <Select value={form.pet_type} onValueChange={(v) => updateField("pet_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Dog</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Retail Price (USD) *</Label>
            <Input type="number" value={form.price} onChange={(e) => updateField("price", e.target.value)} placeholder="29.99" />
          </div>
          <div>
            <Label className="text-sm">Cost Price (USD)</Label>
            <Input type="number" value={form.cost_price} onChange={(e) => updateField("cost_price", e.target.value)} placeholder="12.50" />
          </div>
          <div>
            <Label className="text-sm">Min Order Qty</Label>
            <Input type="number" value={form.min_order_qty} onChange={(e) => updateField("min_order_qty", e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Life Stage</Label>
            <Select value={form.life_stage} onValueChange={(v) => updateField("life_stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="puppy">Puppy</SelectItem>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="all">All Stages</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Weight (kg)</Label>
            <Input type="number" value={form.weight_kg} onChange={(e) => updateField("weight_kg", e.target.value)} placeholder="15" />
          </div>
          <div>
            <Label className="text-sm">Kcal/kg</Label>
            <Input type="number" value={form.kcal_per_kg} onChange={(e) => updateField("kcal_per_kg", e.target.value)} placeholder="3500" />
          </div>
          <div className="col-span-2">
            <Label className="text-sm">Ingredients</Label>
            <Textarea value={form.ingredients} onChange={(e) => updateField("ingredients", e.target.value)} placeholder="Chicken, Rice, Vegetables..." className="min-h-[60px]" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
            Submit for Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
