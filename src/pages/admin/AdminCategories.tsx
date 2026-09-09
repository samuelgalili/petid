import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderTree,
  Tag,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  adoptProductCategoryValue,
  createAdminProductCategory,
  deleteAdminProductCategory,
  getAdminProductCategories,
  getUnmatchedProductCategories,
  updateAdminProductCategory,
  type MipoProductCategory,
} from "@/lib/mipoApi";

interface Brand {
  id: string;
  name: string;
  logo?: string;
  productCount: number;
  isActive: boolean;
}

interface CategoryNode extends MipoProductCategory {
  children: CategoryNode[];
}

interface CategoryForm {
  id: string | null;
  name_he: string;
  name_en: string;
  slug: string;
  icon: string;
  parent_id: string;
  position: string;
  is_active: boolean;
  aliases: string;
}

const NO_PARENT = "__root__";

const emptyForm = (parentId: string | null = null): CategoryForm => ({
  id: null,
  name_he: "",
  name_en: "",
  slug: "",
  icon: "",
  parent_id: parentId ?? NO_PARENT,
  position: "100",
  is_active: true,
  aliases: "",
});

const formFromCategory = (category: MipoProductCategory): CategoryForm => ({
  id: category.id,
  name_he: category.name_he,
  name_en: category.name_en ?? "",
  slug: category.slug,
  icon: category.icon ?? "",
  parent_id: category.parent_id ?? NO_PARENT,
  position: String(category.position),
  is_active: category.is_active,
  aliases: (category.aliases || []).join(", "),
});

// The slug is what the shop URL and the alias table key off, so it is derived
// from the English name when there is one and left for the admin to type when
// the category only has a Hebrew name.
const suggestSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildTree = (categories: MipoProductCategory[]): CategoryNode[] => {
  const byId = new Map<string, CategoryNode>();
  for (const category of categories) byId.set(category.id, { ...category, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.name_he.localeCompare(b.name_he, "he"));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
};

// A search hit keeps its ancestors so the match stays readable in the tree.
const filterTree = (nodes: CategoryNode[], term: string): CategoryNode[] => {
  if (!term) return nodes;
  const needle = term.trim().toLowerCase();

  const walk = (node: CategoryNode): CategoryNode | null => {
    const children = node.children.map(walk).filter((child): child is CategoryNode => child !== null);
    const matches =
      node.name_he.toLowerCase().includes(needle) ||
      (node.name_en || "").toLowerCase().includes(needle) ||
      node.slug.includes(needle) ||
      (node.aliases || []).some((alias) => alias.includes(needle));
    if (!matches && children.length === 0) return null;
    return { ...node, children };
  };

  return nodes.map(walk).filter((node): node is CategoryNode => node !== null);
};

/**
 * What the catalogue calls things that no category claims.
 *
 * The shop filters by the category tree, so a product whose free-text category
 * matches nothing has no place in it and disappears the moment a shopper picks
 * a category — silently, which is how it went unnoticed. This is that queue.
 * Adopting a value both records it as an alias and files every product using
 * it, which is the part that used to be missing: editing the alias list wrote
 * the alias and left the products exactly where they were.
 */
const UnmatchedCategories = ({
  categories,
  onFiled,
}: {
  categories: MipoProductCategory[];
  onFiled: () => void;
}) => {
  const { toast } = useToast();
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const unmatchedQuery = useQuery({
    queryKey: ["admin", "product-categories", "unmatched"],
    queryFn: getUnmatchedProductCategories,
  });

  const adopt = useMutation({
    mutationFn: ({ categoryId, value }: { categoryId: string; value: string }) =>
      adoptProductCategoryValue(categoryId, value),
    onSuccess: (result, variables) => {
      toast({
        title: `שויכו ${result.products_filed} מוצרים`,
        description: `״${variables.value}״ מוכר מעכשיו כקטגוריה, וכל מוצר שנושא אותו שויך.`,
      });
      unmatchedQuery.refetch();
      onFiled();
    },
    onError: (error: Error) => {
      toast({ title: "השיוך נכשל", description: error.message, variant: "destructive" });
    },
  });

  const data = unmatchedQuery.data;
  const values = data?.values ?? [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          מוצרים שאינם מופיעים בסינון
          {data && (
            <span className="text-sm font-normal text-muted-foreground">
              {data.totals.without_category} מתוך {data.totals.total} מוצרים ללא קטגוריה
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unmatchedQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            בודק את הקטלוג...
          </div>
        ) : unmatchedQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {(unmatchedQuery.error as Error)?.message || "הבדיקה נכשלה"}
            </p>
            <Button variant="outline" onClick={() => unmatchedQuery.refetch()}>נסו שוב</Button>
          </div>
        ) : values.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {data && data.totals.without_any_label > 0
              ? `כל שם קטגוריה בקטלוג מוכר. ${data.totals.without_any_label} מוצרים לא נושאים שם קטגוריה כלל — אותם צריך לשייך ידנית במסך המוצרים.`
              : "כל מוצר בקטלוג משויך לקטגוריה."}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="pb-2 text-sm text-muted-foreground">
              הערכים האלה מופיעים בקטלוג ואינם מוכרים לאף קטגוריה, אז המוצרים שנושאים
              אותם נעלמים מהסינון בחנות. בחרו קטגוריה לכל ערך כדי לשייך את כולם.
            </p>

            {values.map((row) => (
              <div
                key={row.value}
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
              >
                <span className="font-medium">{row.value}</span>
                <Badge variant="secondary">{row.product_count} מוצרים</Badge>

                <div className="ms-auto flex items-center gap-2">
                  <Select
                    value={chosen[row.value] || ""}
                    onValueChange={(value) => setChosen((state) => ({ ...state, [row.value]: value }))}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="שייך לקטגוריה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon ? `${category.icon} ` : ""}
                          {category.name_he}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    disabled={!chosen[row.value] || adopt.isPending}
                    onClick={() =>
                      adopt.mutate({ categoryId: chosen[row.value], value: row.value })
                    }
                  >
                    {adopt.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שייך"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<MipoProductCategory | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [blockedProducts, setBlockedProducts] = useState<number | null>(null);

  const [brands] = useState<Brand[]>([
    { id: "1", name: "Royal Canin", productCount: 45, isActive: true },
    { id: "2", name: "Hills", productCount: 38, isActive: true },
    { id: "3", name: "Purina Pro Plan", productCount: 32, isActive: true },
    { id: "4", name: "Orijen", productCount: 28, isActive: true },
    { id: "5", name: "Acana", productCount: 24, isActive: true },
    { id: "6", name: "Brit", productCount: 19, isActive: false },
  ]);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "product-categories"],
    queryFn: getAdminProductCategories,
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const tree = useMemo(() => buildTree(categories), [categories]);
  const visibleTree = useMemo(() => filterTree(tree, searchTerm), [tree, searchTerm]);
  const totalProducts = useMemo(
    () => categories.reduce((sum, category) => sum + category.product_count, 0),
    [categories],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "product-categories"] });
    // The shop bar and the product list both read categories.
    queryClient.invalidateQueries({ queryKey: ["shop-categories"] });
    queryClient.invalidateQueries({ queryKey: ["shop-products-aws"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryForm) => {
      const payload = {
        name_he: values.name_he.trim(),
        name_en: values.name_en.trim() || null,
        slug: values.slug.trim().toLowerCase(),
        icon: values.icon.trim() || null,
        parent_id: values.parent_id === NO_PARENT ? null : values.parent_id,
        position: Number(values.position) || 0,
        is_active: values.is_active,
        aliases: values.aliases
          .split(",")
          .map((alias) => alias.trim().toLowerCase())
          .filter(Boolean),
      };
      return values.id
        ? updateAdminProductCategory(values.id, payload)
        : createAdminProductCategory(payload);
    },
    onSuccess: (category) => {
      invalidate();
      setFormOpen(false);
      toast({ title: form.id ? "הקטגוריה עודכנה" : "הקטגוריה נוספה", description: category.name_he });
    },
    onError: (error: Error) => {
      toast({ title: "השמירה נכשלה", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, target }: { id: string; target: string | null }) =>
      deleteAdminProductCategory(id, target),
    onSuccess: (result) => {
      if (result.deleted) {
        invalidate();
        setDeleteTarget(null);
        setReassignTo("");
        setBlockedProducts(null);
        toast({
          title: "הקטגוריה נמחקה",
          description: result.reassigned
            ? `${result.reassigned} מוצרים הועברו לקטגוריה שבחרת`
            : undefined,
        });
        return;
      }

      if (result.reason === "has_children") {
        toast({
          title: "אי אפשר למחוק",
          description: `יש ${result.children} תת-קטגוריות מתחת לקטגוריה הזו. מחקו או העבירו אותן קודם.`,
          variant: "destructive",
        });
        setDeleteTarget(null);
        return;
      }

      if (result.reason === "has_products") {
        // Stay in the dialog and ask where the products should go.
        setBlockedProducts(result.products ?? 0);
        return;
      }

      toast({ title: "הקטגוריה לא נמצאה", variant: "destructive" });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "המחיקה נכשלה", description: error.message, variant: "destructive" });
    },
  });

  const openCreate = (parentId: string | null = null) => {
    setForm(emptyForm(parentId));
    setFormOpen(true);
  };

  const openEdit = (category: MipoProductCategory) => {
    setForm(formFromCategory(category));
    setFormOpen(true);
  };

  const openDelete = (category: MipoProductCategory) => {
    setDeleteTarget(category);
    setBlockedProducts(null);
    setReassignTo("");
  };

  // A category cannot become its own descendant, so those rows are not offered
  // as a parent. The server enforces this too.
  const parentOptions = useMemo(() => {
    if (!form.id) return categories;
    const banned = new Set<string>([form.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (category.parent_id && banned.has(category.parent_id) && !banned.has(category.id)) {
          banned.add(category.id);
          changed = true;
        }
      }
    }
    return categories.filter((category) => !banned.has(category.id));
  }, [categories, form.id]);

  const reassignOptions = useMemo(
    () => categories.filter((category) => category.id !== deleteTarget?.id),
    [categories, deleteTarget?.id],
  );

  const CategoryRow = ({ node, level = 0 }: { node: CategoryNode; level?: number }) => {
    const hasChildren = node.children.length > 0;
    const isOpen = !collapsed[node.id];

    return (
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex items-center gap-2 p-3 rounded-lg border mb-2 hover:bg-muted/50 transition-colors ${
            node.is_active ? "" : "opacity-60"
          }`}
          style={{ marginRight: level * 24 }}
        >
          {hasChildren ? (
            <button
              onClick={() => setCollapsed((state) => ({ ...state, [node.id]: isOpen }))}
              className="p-1 hover:bg-muted rounded"
              aria-label={isOpen ? "כווץ" : "הרחב"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {node.icon ? <span className="text-lg leading-none">{node.icon}</span> : null}

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {node.name_he}
              {!node.is_active && <span className="mr-2 text-xs text-muted-foreground">(מוסתרת בחנות)</span>}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {node.slug}
              {node.aliases.length > 0 && ` · ${node.aliases.length} כינויי ייבוא`}
            </p>
          </div>

          <Badge variant="secondary">{node.product_count} מוצרים</Badge>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => openCreate(node.id)} aria-label="הוסף תת-קטגוריה">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(node)} aria-label="עריכה">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => openDelete(node)}
              aria-label="מחיקה"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {hasChildren && isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {node.children.map((child) => (
                <CategoryRow key={child.id} node={child} level={level + 1} />
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
                    <span className="text-sm font-normal text-muted-foreground">
                      {categories.length} קטגוריות · {totalProducts} מוצרים משויכים
                    </span>
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
                    <Button className="gap-2" onClick={() => openCreate(null)}>
                      <Plus className="h-4 w-4" />
                      הוסף קטגוריה
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {categoriesQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    טוען קטגוריות...
                  </div>
                ) : categoriesQuery.isError ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      {(categoriesQuery.error as Error)?.message || "טעינת הקטגוריות נכשלה"}
                    </p>
                    <Button variant="outline" onClick={() => categoriesQuery.refetch()}>
                      נסו שוב
                    </Button>
                  </div>
                ) : visibleTree.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {searchTerm ? "לא נמצאה קטגוריה מתאימה" : "עדיין אין קטגוריות"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visibleTree.map((node) => (
                      <CategoryRow key={node.id} node={node} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <UnmatchedCategories categories={categories} onFiled={invalidate} />
          </TabsContent>

          <TabsContent value="brands" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    מותגים
                    <Badge variant="outline">נתוני הדגמה</Badge>
                  </CardTitle>
                  <Button className="gap-2" disabled>
                    <Plus className="h-4 w-4" />
                    הוסף מותג
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  ניהול המותגים עדיין לא מחובר לבסיס הנתונים — המספרים כאן הם דוגמה בלבד.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className={`p-4 rounded-lg border ${brand.isActive ? "" : "opacity-60"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
                            {brand.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{brand.name}</p>
                            <Badge variant={brand.isActive ? "default" : "secondary"}>
                              {brand.isActive ? "פעיל" : "לא פעיל"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{brand.productCount} מוצרים</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
            <DialogDescription>
              הקטגוריה מופיעה בסרגל החנות לפי סדר המיקום, ומוסתרת כשהיא לא פעילה.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category-name-he">שם בעברית</Label>
                <Input
                  id="category-name-he"
                  value={form.name_he}
                  onChange={(e) => setForm((state) => ({ ...state, name_he: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-name-en">שם באנגלית</Label>
                <Input
                  id="category-name-en"
                  value={form.name_en}
                  onChange={(e) => {
                    const name_en = e.target.value;
                    setForm((state) => ({
                      ...state,
                      name_en,
                      slug: state.id || state.slug ? state.slug : suggestSlug(name_en),
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="category-slug">מזהה (slug)</Label>
                <Input
                  id="category-slug"
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm((state) => ({ ...state, slug: e.target.value }))}
                  placeholder="dry-food"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-icon">אייקון</Label>
                <Input
                  id="category-icon"
                  value={form.icon}
                  onChange={(e) => setForm((state) => ({ ...state, icon: e.target.value }))}
                  placeholder="🍖"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>קטגוריית אב</Label>
                <Select
                  value={form.parent_id}
                  onValueChange={(value) => setForm((state) => ({ ...state, parent_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>ללא (קטגוריה ראשית)</SelectItem>
                    {parentOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_he}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-position">מיקום בסרגל</Label>
                <Input
                  id="category-position"
                  type="number"
                  min={0}
                  value={form.position}
                  onChange={(e) => setForm((state) => ({ ...state, position: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-aliases">כינויי ייבוא</Label>
              <Input
                id="category-aliases"
                value={form.aliases}
                onChange={(e) => setForm((state) => ({ ...state, aliases: e.target.value }))}
                placeholder="מזון יבש, dry food"
              />
              <p className="text-xs text-muted-foreground">
                מופרדים בפסיק. מוצר שמיובא עם אחד מהערכים האלה בשדה הקטגוריה החופשי ישויך לכאן אוטומטית.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="category-active">פעילה בחנות</Label>
                <p className="text-xs text-muted-foreground">כשמכובה, הקטגוריה לא מופיעה בסרגל הסינון.</p>
              </div>
              <Switch
                id="category-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((state) => ({ ...state, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name_he.trim() || !form.slug.trim()}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              שמירה
            </Button>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setBlockedProducts(null);
            setReassignTo("");
          }
        }}
        title={`מחיקת ${deleteTarget?.name_he ?? "קטגוריה"}`}
        variant="destructive"
        confirmLabel={blockedProducts === null ? "מחיקה" : "העבירו ומחקו"}
        loading={deleteMutation.isPending}
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        description={
          blockedProducts === null ? (
            "המוצרים עצמם לא נמחקים — רק השיוך לקטגוריה."
          ) : (
            <span className="block space-y-3">
              <span className="block">
                לקטגוריה הזו משויכים {blockedProducts} מוצרים. בחרו לאן להעביר אותם לפני המחיקה.
              </span>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="בחרו קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {reassignOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_he}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          )
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          if (blockedProducts !== null && !reassignTo) {
            toast({ title: "בחרו קטגוריה להעברת המוצרים", variant: "destructive" });
            return;
          }
          deleteMutation.mutate({ id: deleteTarget.id, target: reassignTo || null });
        }}
      />
    </AdminLayout>
  );
};

export default AdminCategories;
