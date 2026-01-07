import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: Date;
  scheduledAt?: Date;
  views: number;
  tags: string[];
  featuredImage?: string;
}

const AdminBlog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [posts, setPosts] = useState<BlogPost[]>([
    {
      id: '1',
      title: '10 טיפים לאילוף גורים',
      slug: '10-tips-puppy-training',
      excerpt: 'המדריך המלא לאילוף גור הכלב שלכם בצורה חיובית ואפקטיבית',
      author: 'ד"ר שרה כהן',
      status: 'published',
      publishedAt: new Date(Date.now() - 86400000),
      views: 1250,
      tags: ['אילוף', 'גורים', 'טיפים'],
      featuredImage: '/placeholder.svg'
    },
    {
      id: '2',
      title: 'איך לבחור מזון איכותי לחתול',
      slug: 'how-to-choose-cat-food',
      excerpt: 'מדריך מקיף לבחירת המזון הטוב ביותר עבור החתול שלכם',
      author: 'יוסי לוי',
      status: 'published',
      publishedAt: new Date(Date.now() - 172800000),
      views: 890,
      tags: ['תזונה', 'חתולים', 'מדריך'],
      featuredImage: '/placeholder.svg'
    },
    {
      id: '3',
      title: 'סימנים לזיהוי מחלות אצל כלבים',
      slug: 'dog-illness-signs',
      excerpt: 'למדו לזהות סימנים מוקדמים שעשויים להעיד על בעיות בריאותיות',
      author: 'ד"ר שרה כהן',
      status: 'draft',
      views: 0,
      tags: ['בריאות', 'כלבים', 'וטרינר']
    },
    {
      id: '4',
      title: 'הכנה לקיץ עם חיות המחמד',
      slug: 'summer-prep-pets',
      excerpt: 'כל מה שצריך לדעת כדי לשמור על חיית המחמד שלכם בטוחה בקיץ',
      author: 'מיכל דוד',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 604800000),
      views: 0,
      tags: ['קיץ', 'בטיחות', 'טיפים']
    }
  ]);

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

  const filteredPosts = posts.filter(post => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (searchTerm && !post.title.includes(searchTerm)) return false;
    return true;
  });

  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
  const publishedCount = posts.filter(p => p.status === 'published').length;

  return (
    <AdminLayout title="בלוג ותוכן">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">בלוג ותוכן</h1>
            <p className="text-muted-foreground">ניהול מאמרים ותוכן SEO</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            מאמר חדש
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
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
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'scheduled').length}</p>
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
                <TabsTrigger value="all">הכל ({posts.length})</TabsTrigger>
                <TabsTrigger value="published">פורסמו ({posts.filter(p => p.status === 'published').length})</TabsTrigger>
                <TabsTrigger value="draft">טיוטות ({posts.filter(p => p.status === 'draft').length})</TabsTrigger>
                <TabsTrigger value="scheduled">מתוזמנים ({posts.filter(p => p.status === 'scheduled').length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <div className="flex gap-4">
                    {post.featuredImage ? (
                      <div className="w-32 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        <img 
                          src={post.featuredImage} 
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
                        <h3 className="font-medium">{post.title}</h3>
                        {getStatusBadge(post.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>מאת: {post.author}</span>
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(post.publishedAt, 'dd/MM/yyyy', { locale: he })}
                          </span>
                        )}
                        {post.scheduledAt && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Clock className="h-3 w-3" />
                            מתוזמן ל-{format(post.scheduledAt, 'dd/MM/yyyy', { locale: he })}
                          </span>
                        )}
                        {post.status === 'published' && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.views.toLocaleString()} צפיות
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {post.tags.map(tag => (
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
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SEO Tips */}
        <Card>
          <CardHeader>
            <CardTitle>טיפים ל-SEO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <h4 className="font-medium text-green-700 mb-2">✓ כותרות אופטימליות</h4>
                <p className="text-sm text-green-600">רוב המאמרים מכילים כותרות באורך מתאים</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <h4 className="font-medium text-yellow-700 mb-2">⚠ תיאורי Meta</h4>
                <p className="text-sm text-yellow-600">3 מאמרים חסרי תיאור Meta</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <h4 className="font-medium text-red-700 mb-2">✗ תמונות Alt</h4>
                <p className="text-sm text-red-600">5 תמונות ללא תיאור Alt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
