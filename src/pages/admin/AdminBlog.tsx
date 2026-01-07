import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  FileText, 
  Eye, 
  Edit,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  Clock,
  Tag,
  Image
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const AdminBlog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    title_he: "",
    content: "",
    excerpt: "",
    status: "draft",
    tags: "",
    slug: ""
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const slug = data.slug || data.title_he?.toLowerCase().replace(/\s+/g, '-') || `post-${Date.now()}`;
      const { error } = await supabase
        .from('blog_posts')
        .insert({
          title: data.title || data.title_he,
          title_he: data.title_he,
          content: data.content,
          excerpt: data.excerpt,
          status: data.status,
          slug,
          tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
          published_at: data.status === 'published' ? new Date().toISOString() : null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('המאמר נוצר בהצלחה');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('שגיאה ביצירת המאמר');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: data.title || data.title_he,
          title_he: data.title_he,
          content: data.content,
          excerpt: data.excerpt,
          status: data.status,
          tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
          published_at: data.status === 'published' ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('המאמר עודכן בהצלחה');
      setIsDialogOpen(false);
      setEditingPost(null);
      resetForm();
    },
    onError: () => {
      toast.error('שגיאה בעדכון המאמר');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('המאמר נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת המאמר');
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      title_he: "",
      content: "",
      excerpt: "",
      status: "draft",
      tags: "",
      slug: ""
    });
  };

  const handleOpenCreate = () => {
    setEditingPost(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (post: any) => {
    setEditingPost(post);
    setFormData({
      title: post.title || "",
      title_he: post.title_he || "",
      content: post.content || "",
      excerpt: post.excerpt || "",
      status: post.status || "draft",
      tags: post.tags?.join(', ') || "",
      slug: post.slug || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title_he && !formData.title) {
      toast.error('נא למלא כותרת');
      return;
    }
    if (!formData.content) {
      toast.error('נא למלא תוכן');
      return;
    }
    
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-700">פורסם</Badge>;
      case 'draft':
        return <Badge variant="secondary">טיוטה</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">מתוזמן</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPosts = posts?.filter(post => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (searchTerm && !post.title?.includes(searchTerm) && !post.title_he?.includes(searchTerm)) return false;
    return true;
  }) || [];

  const totalViews = posts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
  const publishedCount = posts?.filter(p => p.status === 'published').length || 0;

  return (
    <AdminLayout title="בלוג ותוכן">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">בלוג ותוכן</h1>
            <p className="text-muted-foreground">ניהול מאמרים ותוכן SEO</p>
          </div>
          <Button className="gap-2" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            מאמר חדש
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPost ? "עריכת מאמר" : "מאמר חדש"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>כותרת (עברית) *</Label>
                  <Input
                    value={formData.title_he}
                    onChange={(e) => setFormData({ ...formData, title_he: e.target.value })}
                    placeholder="כותרת המאמר"
                  />
                </div>
                <div>
                  <Label>כותרת (אנגלית)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Article Title"
                  />
                </div>
              </div>
              <div>
                <Label>תקציר</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="תקציר קצר של המאמר..."
                  rows={2}
                />
              </div>
              <div>
                <Label>תוכן *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="תוכן המאמר..."
                  rows={8}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">טיוטה</SelectItem>
                      <SelectItem value="published">פורסם</SelectItem>
                      <SelectItem value="scheduled">מתוזמן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>תגיות (מופרדות בפסיק)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="כלבים, טיפול, בריאות"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "שומר..." : editingPost ? "עדכן" : "צור מאמר"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">סה"כ מאמרים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-sm text-muted-foreground">מפורסמים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">צפיות כוללות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts?.filter(p => p.status === 'scheduled').length || 0}</p>
                <p className="text-sm text-muted-foreground">מתוזמנים</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                רשימת מאמרים
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש מאמר..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-64"
                  />
                </div>
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-2">
              <TabsList>
                <TabsTrigger value="all">הכל ({posts?.length || 0})</TabsTrigger>
                <TabsTrigger value="published">פורסמו ({posts?.filter(p => p.status === 'published').length || 0})</TabsTrigger>
                <TabsTrigger value="draft">טיוטות ({posts?.filter(p => p.status === 'draft').length || 0})</TabsTrigger>
                <TabsTrigger value="scheduled">מתוזמנים ({posts?.filter(p => p.status === 'scheduled').length || 0})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>אין מאמרים להצגה</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className="flex gap-4">
                      {post.featured_image ? (
                        <div className="w-32 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          <img 
                            src={post.featured_image} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{post.title_he || post.title}</h3>
                          {getStatusBadge(post.status || 'draft')}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(post.published_at), 'dd/MM/yyyy', { locale: he })}
                            </span>
                          )}
                          {post.scheduled_at && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="h-3 w-3" />
                              מתוזמן ל-{format(new Date(post.scheduled_at), 'dd/MM/yyyy', { locale: he })}
                            </span>
                          )}
                          {post.status === 'published' && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {(post.view_count || 0).toLocaleString()} צפיות
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {post.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(post)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
