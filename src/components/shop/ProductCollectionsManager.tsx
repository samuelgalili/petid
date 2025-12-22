import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, Trash2, Edit2, GripVertical, Image, Package, X, Save, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

interface ProductCollectionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export const ProductCollectionsManager = ({ open, onOpenChange, businessId }: ProductCollectionsManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['product-collections', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_collections')
        .select(`
          *,
          collection_products(product_id)
        `)
        .eq('business_id', businessId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['business-products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, image_url, price')
        .eq('business_id', businessId);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && (isAdding || !!editingId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: collection, error: collectionError } = await supabase
        .from('product_collections')
        .insert({
          business_id: businessId,
          name,
          description: description || null,
          is_featured: isFeatured,
        })
        .select()
        .single();
      
      if (collectionError) throw collectionError;

      if (selectedProducts.length > 0) {
        const { error: productsError } = await supabase
          .from('collection_products')
          .insert(
            selectedProducts.map((productId, index) => ({
              collection_id: collection.id,
              product_id: productId,
              display_order: index,
            }))
          );
        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-collections'] });
      resetForm();
      toast({ title: 'אוסף נוצר בהצלחה' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: collectionError } = await supabase
        .from('product_collections')
        .update({ name, description, is_featured: isFeatured })
        .eq('id', id);
      
      if (collectionError) throw collectionError;

      // Delete existing and re-add products
      await supabase.from('collection_products').delete().eq('collection_id', id);
      
      if (selectedProducts.length > 0) {
        await supabase
          .from('collection_products')
          .insert(
            selectedProducts.map((productId, index) => ({
              collection_id: id,
              product_id: productId,
              display_order: index,
            }))
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-collections'] });
      resetForm();
      toast({ title: 'אוסף עודכן בהצלחה' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_collections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-collections'] });
      toast({ title: 'אוסף נמחק' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsFeatured(false);
    setSelectedProducts([]);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (collection: any) => {
    setName(collection.name);
    setDescription(collection.description || '');
    setIsFeatured(collection.is_featured);
    setSelectedProducts(collection.collection_products?.map((cp: any) => cp.product_id) || []);
    setEditingId(collection.id);
    setIsAdding(true);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-primary" />
            אוספי מוצרים
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isAdding ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-4 bg-muted/30 rounded-xl"
            >
              <Input
                placeholder="שם האוסף (למשל: מבצעי חורף)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                placeholder="תיאור (אופציונלי)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <Label>אוסף מומלץ</Label>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label className="text-sm">בחר מוצרים לאוסף</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedProducts.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        className="pointer-events-none"
                      />
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">₪{product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  <X className="w-4 h-4 ml-1" />
                  ביטול
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => editingId ? updateMutation.mutate(editingId) : createMutation.mutate()}
                  disabled={!name.trim()}
                >
                  <Save className="w-4 h-4 ml-1" />
                  {editingId ? 'עדכון' : 'שמירה'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-2" />
              צור אוסף חדש
            </Button>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : collections.length === 0 && !isAdding ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">אין אוספים עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">
                צור אוספים לארגון המוצרים שלך
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {collections.map((collection: any) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="flex items-center gap-3 p-3 bg-card border rounded-xl"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    {collection.cover_image_url ? (
                      <img
                        src={collection.cover_image_url}
                        alt={collection.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{collection.name}</span>
                      {collection.is_featured && (
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {collection.collection_products?.length || 0} מוצרים
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(collection)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(collection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
