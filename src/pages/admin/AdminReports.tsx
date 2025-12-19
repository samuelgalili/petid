import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  AlertTriangle,
  UserX,
  Trash2,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  report_type: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reporter?: {
    full_name: string;
    avatar_url: string;
  };
  reported_user?: {
    full_name: string;
    avatar_url: string;
  };
  reported_post?: {
    image_url: string;
    caption: string;
  };
}

const statusConfig = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  reviewed: { label: "נבדק", color: "bg-blue-100 text-blue-800", icon: Eye },
  resolved: { label: "טופל", color: "bg-green-100 text-green-800", icon: CheckCircle },
  dismissed: { label: "נדחה", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

const typeConfig = {
  spam: { label: "ספאם", icon: Trash2 },
  inappropriate: { label: "תוכן לא הולם", icon: AlertTriangle },
  harassment: { label: "הטרדה", icon: UserX },
  fake: { label: "פרופיל מזויף", icon: Flag },
  other: { label: "אחר", icon: MoreHorizontal },
};

const AdminReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchQuery, statusFilter, reports]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const { data: reportsData, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data
      const enrichedReports = await Promise.all(
        (reportsData || []).map(async (report) => {
          const enriched: Report = { ...report };

          // Fetch reporter profile
          if (report.reporter_id) {
            const { data: reporter } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", report.reporter_id)
              .maybeSingle();
            if (reporter) enriched.reporter = reporter;
          }

          // Fetch reported user profile
          if (report.reported_user_id) {
            const { data: reportedUser } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", report.reported_user_id)
              .maybeSingle();
            if (reportedUser) enriched.reported_user = reportedUser;
          }

          // Fetch reported post
          if (report.reported_post_id) {
            const { data: post } = await supabase
              .from("posts")
              .select("image_url, caption")
              .eq("id", report.reported_post_id)
              .maybeSingle();
            if (post) enriched.reported_post = post;
          }

          return enriched;
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת דיווחים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.reporter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reported_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("reports")
        .update({
          status: newStatus as any,
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: newStatus, admin_notes: adminNotes } : r
        )
      );

      setSelectedReport(null);
      setAdminNotes("");

      toast({
        title: "הסטטוס עודכן",
        description: `הדיווח סומן כ${statusConfig[newStatus as keyof typeof statusConfig]?.label}`,
      });
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון הדיווח",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const config = typeConfig[type as keyof typeof typeConfig];
    return config?.icon || Flag;
  };

  return (
    <div className="min-h-screen pb-20 bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-bold">דיווחים</h1>
          <Button variant="ghost" size="icon" onClick={fetchReports}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="reviewed">נבדק</SelectItem>
              <SelectItem value="resolved">טופל</SelectItem>
              <SelectItem value="dismissed">נדחה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Reports List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">אין דיווחים</p>
          </div>
        ) : (
          filteredReports.map((report, index) => {
            const TypeIcon = getTypeIcon(report.report_type);
            const status = statusConfig[report.status as keyof typeof statusConfig];
            const StatusIcon = status?.icon || Clock;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedReport(report);
                    setAdminNotes(report.admin_notes || "");
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Post preview or user avatar */}
                    {report.reported_post ? (
                      <img
                        src={report.reported_post.image_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : report.reported_user ? (
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={report.reported_user.avatar_url} />
                        <AvatarFallback>{report.reported_user.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Flag className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-sm">
                          {typeConfig[report.report_type as keyof typeof typeConfig]?.label}
                        </span>
                        <Badge className={`text-xs ${status?.color}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {status?.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-1">
                        דווח על ידי: {report.reporter?.full_name || "לא ידוע"}
                      </p>

                      {report.reported_user && (
                        <p className="text-xs text-muted-foreground">
                          נגד: {report.reported_user.full_name}
                        </p>
                      )}

                      {report.description && (
                        <p className="text-sm text-foreground mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(report.created_at), "d בMMMM yyyy, HH:mm", { locale: he })}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי דיווח</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Type & Status */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {typeConfig[selectedReport.report_type as keyof typeof typeConfig]?.label}
                </Badge>
                <Badge className={statusConfig[selectedReport.status as keyof typeof statusConfig]?.color}>
                  {statusConfig[selectedReport.status as keyof typeof statusConfig]?.label}
                </Badge>
              </div>

              {/* Content Preview */}
              {selectedReport.reported_post && (
                <div>
                  <p className="text-sm font-medium mb-2">תוכן שדווח:</p>
                  <img
                    src={selectedReport.reported_post.image_url}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {selectedReport.reported_post.caption && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedReport.reported_post.caption}
                    </p>
                  )}
                </div>
              )}

              {/* Reporter */}
              <div>
                <p className="text-sm font-medium mb-2">מדווח:</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedReport.reporter?.avatar_url} />
                    <AvatarFallback>{selectedReport.reporter?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{selectedReport.reporter?.full_name}</span>
                </div>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium mb-2">תיאור:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.description}</p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <p className="text-sm font-medium mb-2">הערות מנהל:</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="הוסף הערות..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateReportStatus(selectedReport.id, "dismissed")}
                  disabled={updating}
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  דחה
                </Button>
                <Button
                  onClick={() => updateReportStatus(selectedReport.id, "resolved")}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  טופל
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
