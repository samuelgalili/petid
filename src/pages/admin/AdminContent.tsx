import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, Image, Video, Pin, PinOff, Trash2, 
  RotateCcw, MoreHorizontal, Eye, Star, StarOff
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column, FilterOption } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface PostData {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  is_pinned: boolean;
  is_featured: boolean;
  removed_at: string | null;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const AdminContent = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [previewPost, setPreviewPost] = useState<PostData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    postId?: string;
    action?: "remove" | "restore" | "pin" | "unpin" | "feature" | "unfeature";
  }>({ open: false });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, image_url, caption, created_at, is_pinned, is_featured, removed_at,
          user:profiles!posts_user_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as unknown as PostData[];
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ 
      postId, 
      updates 
    }: { 
      postId: string; 
      updates: Partial<{ is_pinned: boolean; is_featured: boolean; removed_at: string | null; removed_by: string | null; removal_reason: string | null }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("posts")
        .update({
          ...updates,
          ...(updates.removed_at !== undefined && { removed_by: updates.removed_at ? user?.id : null }),
        })
        .eq("id", postId);

      if (error) throw error;

      // Log the action
      if (updates.is_pinned !== undefined) {
        await logAction({
          action_type: updates.is_pinned ? "post.pinned" : "post.unpinned",
          entity_type: "post",
          entity_id: postId,
        });
      }
      if (updates.removed_at !== undefined) {
        await logAction({
          action_type: updates.removed_at ? "post.removed" : "post.restored",
          entity_type: "post",
          entity_id: postId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast({ title: "הפוסט עודכן בהצלחה" });
      setConfirmDialog({ open: false });
    },
    onError: () => {
      toast({ title: "שגיאה", description: "הפעולה נכשלה", variant: "destructive" });
    },
  });

  const handleAction = (action: string, postId: string) => {
    const updates: any = {};
    
    switch (action) {
      case "pin":
        updates.is_pinned = true;
        break;
      case "unpin":
        updates.is_pinned = false;
        break;
      case "feature":
        updates.is_featured = true;
        break;
      case "unfeature":
        updates.is_featured = false;
        break;
      case "remove":
        updates.removed_at = new Date().toISOString();
        updates.removal_reason = "הוסר על ידי מנהל";
        break;
      case "restore":
        updates.removed_at = null;
        updates.removed_by = null;
        updates.removal_reason = null;
        break;
    }

    if (action === "remove") {
      setConfirmDialog({ open: true, postId, action: "remove" });
    } else {
      updatePostMutation.mutate({ postId, updates });
    }
  };

  const columns: Column<PostData>[] = [
    {
      key: "content",
      header: "תוכן",
      render: (post) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-16 h-16 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPreviewPost(post)}
          >
            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2">{post.caption || "ללא כיתוב"}</p>
            <div className="flex gap-1 mt-1">
              {post.is_pinned && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  <Pin className="w-3 h-3 ml-1" />
                  מוצמד
                </Badge>
              )}
              {post.is_featured && (
                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                  <Star className="w-3 h-3 ml-1" />
                  מקודם
                </Badge>
              )}
              {post.removed_at && (
                <Badge variant="destructive" className="text-xs">
                  <Trash2 className="w-3 h-3 ml-1" />
                  הוסר
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "user",
      header: "מפרסם",
      render: (post) => (
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.user?.avatar_url || undefined} />
            <AvatarFallback>{post.user?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{post.user?.full_name || "לא ידוע"}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "תאריך",
      sortable: true,
      render: (post) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(post.created_at), "d בMMM yyyy", { locale: he })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (post) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPreviewPost(post)}>
              <Eye className="w-4 h-4 ml-2" />
              צפייה
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {post.is_pinned ? (
              <DropdownMenuItem onClick={() => handleAction("unpin", post.id)}>
                <PinOff className="w-4 h-4 ml-2" />
                הסר הצמדה
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleAction("pin", post.id)}>
                <Pin className="w-4 h-4 ml-2" />
                הצמד
              </DropdownMenuItem>
            )}
            {post.is_featured ? (
              <DropdownMenuItem onClick={() => handleAction("unfeature", post.id)}>
                <StarOff className="w-4 h-4 ml-2" />
                הסר קידום
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleAction("feature", post.id)}>
                <Star className="w-4 h-4 ml-2" />
                קדם
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {post.removed_at ? (
              <DropdownMenuItem onClick={() => handleAction("restore", post.id)}>
                <RotateCcw className="w-4 h-4 ml-2" />
                שחזר
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => handleAction("remove", post.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                הסר
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: FilterOption[] = [
    {
      key: "status",
      label: "סטטוס",
      options: [
        { value: "active", label: "פעילים" },
        { value: "removed", label: "הוסרו" },
        { value: "pinned", label: "מוצמדים" },
        { value: "featured", label: "מקודמים" },
      ],
    },
  ];

  return (
    <AdminLayout title="ניהול תוכן" breadcrumbs={[{ label: "תוכן" }]}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="posts" className="gap-2">
            <Image className="w-4 h-4" />
            פוסטים ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Video className="w-4 h-4" />
            סטוריז
          </TabsTrigger>
          <TabsTrigger value="reels" className="gap-2">
            <Video className="w-4 h-4" />
            Reels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <DataTable
            data={posts}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="חיפוש לפי כיתוב..."
            searchKey={(item, query) => 
              item.caption?.toLowerCase().includes(query.toLowerCase()) ?? false
            }
            selectable
            selectedItems={selectedPosts}
            onSelectionChange={setSelectedPosts}
            emptyIcon={<FileText className="w-12 h-12" />}
            emptyMessage="לא נמצאו פוסטים"
            bulkActions={
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Pin className="w-4 h-4 ml-1" />
                  הצמד נבחרים
                </Button>
                <Button size="sm" variant="destructive">
                  <Trash2 className="w-4 h-4 ml-1" />
                  הסר נבחרים
                </Button>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="stories">
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 ml-4" />
            <span>ניהול סטוריז יהיה זמין בקרוב</span>
          </div>
        </TabsContent>

        <TabsContent value="reels">
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 ml-4" />
            <span>ניהול Reels יהיה זמין בקרוב</span>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה</DialogTitle>
          </DialogHeader>
          {previewPost && (
            <div className="space-y-4">
              <img 
                src={previewPost.image_url} 
                alt="" 
                className="w-full rounded-lg"
              />
              {previewPost.caption && (
                <p className="text-sm">{previewPost.caption}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={previewPost.user?.avatar_url || undefined} />
                  <AvatarFallback>{previewPost.user?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{previewPost.user?.full_name}</span>
                <span>•</span>
                <span>{format(new Date(previewPost.created_at), "d בMMM yyyy", { locale: he })}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.action === "remove"}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title="הסרת פוסט"
        description="האם אתה בטוח שברצונך להסיר את הפוסט? ניתן לשחזר אותו מאוחר יותר."
        confirmLabel="הסר"
        variant="destructive"
        loading={updatePostMutation.isPending}
        onConfirm={() => {
          if (confirmDialog.postId) {
            updatePostMutation.mutate({
              postId: confirmDialog.postId,
              updates: {
                removed_at: new Date().toISOString(),
                removal_reason: "הוסר על ידי מנהל",
              },
            });
          }
        }}
        icon={<Trash2 className="w-5 h-5 text-destructive" />}
      />
    </AdminLayout>
  );
};

export default AdminContent;
