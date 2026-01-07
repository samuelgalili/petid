import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FolderTree, 
  Tag, 
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  name: string;
  nameHe: string;
  slug: string;
  productCount: number;
  children?: Category[];
  isExpanded?: boolean;
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  productCount: number;
  isActive: boolean;
}

const AdminCategories = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Dog Food',
      nameHe: 'מזון לכלבים',
      slug: 'dog-food',
      productCount: 45,
      isExpanded: false,
      children: [
        { id: '1-1', name: 'Dry Food', nameHe: 'יבש', slug: 'dry-food', productCount: 20 },
        { id: '1-2', name: 'Wet Food', nameHe: 'רטוב', slug: 'wet-food', productCount: 15 },
        { id: '1-3', name: 'Treats', nameHe: 'חטיפים', slug: 'treats', productCount: 10 },
      ]
    },
    {
      id: '2',
      name: 'Cat Food',
      nameHe: 'מזון לחתולים',
      slug: 'cat-food',
      productCount: 38,
      isExpanded: false,
      children: [
        { id: '2-1', name: 'Dry Food', nameHe: 'יבש', slug: 'cat-dry-food', productCount: 18 },
        { id: '2-2', name: 'Wet Food', nameHe: 'רטוב', slug: 'cat-wet-food', productCount: 20 },
      ]
    },
    {
      id: '3',
      name: 'Accessories',
      nameHe: 'אביזרים',
      slug: 'accessories',
      productCount: 67,
      isExpanded: false,
      children: [
        { id: '3-1', name: 'Collars', nameHe: 'קולרים', slug: 'collars', productCount: 25 },
        { id: '3-2', name: 'Leashes', nameHe: 'רצועות', slug: 'leashes', productCount: 22 },
        { id: '3-3', name: 'Beds', nameHe: 'מיטות', slug: 'beds', productCount: 20 },
      ]
    },
    {
      id: '4',
      name: 'Health',
      nameHe: 'בריאות',
      slug: 'health',
      productCount: 29,
    }
  ]);

  const [brands, setBrands] = useState<Brand[]>([
    { id: '1', name: 'Royal Canin', productCount: 45, isActive: true },
    { id: '2', name: 'Hills', productCount: 38, isActive: true },
    { id: '3', name: 'Purina Pro Plan', productCount: 32, isActive: true },
    { id: '4', name: 'Orijen', productCount: 28, isActive: true },
    { id: '5', name: 'Acana', productCount: 24, isActive: true },
    { id: '6', name: 'Brit', productCount: 19, isActive: false },
  ]);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, isExpanded: !cat.isExpanded } : cat
    ));
  };

  const CategoryItem = ({ category, level = 0 }: { category: Category; level?: number }) => {
    const hasChildren = category.children && category.children.length > 0;
    
    return (
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-center gap-2 p-3 rounded-lg border mb-2 hover:bg-muted/50 transition-colors`}
          style={{ marginRight: level * 24 }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          {hasChildren ? (
            <button 
              onClick={() => toggleCategory(category.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {category.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          <div className="flex-1">
            <p className="font-medium">{category.nameHe}</p>
            <p className="text-xs text-muted-foreground">{category.slug}</p>
          </div>
          
          <Badge variant="secondary">{category.productCount} מוצרים</Badge>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {hasChildren && category.isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {category.children!.map(child => (
                <CategoryItem key={child.id} category={child} level={level + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AdminLayout title="קטגוריות ומותגים">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">קטגוריות ומותגים</h1>
            <p className="text-muted-foreground">ארגון וניהול קטלוג המוצרים</p>
          </div>
        </div>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories" className="gap-2">
              <FolderTree className="h-4 w-4" />
              קטגוריות
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-2">
              <Tag className="h-4 w-4" />
              מותגים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FolderTree className="h-5 w-5" />
                    עץ קטגוריות
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="חיפוש קטגוריה..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 w-64"
                      />
                    </div>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      הוסף קטגוריה
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map(category => (
                    <CategoryItem key={category.id} category={category} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brands" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    מותגים
                  </CardTitle>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף מותג
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands.map((brand) => (
                    <motion.div
                      key={brand.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border ${brand.isActive ? '' : 'opacity-60'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
                            {brand.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{brand.name}</p>
                            <Badge variant={brand.isActive ? "default" : "secondary"}>
                              {brand.isActive ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{brand.productCount} מוצרים</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
