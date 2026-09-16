import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  HardDrive, 
  Download,
  Upload,
  Clock,
  CheckCircle,
  Database,
  FileText,
  Image,
  Settings,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { AdminStatCard } from "@/components/admin/AdminStyles";

interface Backup {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: "full" | "database" | "files";
  status: "completed" | "in_progress" | "failed";
}

const mockBackups: Backup[] = [
  { id: "1", name: "גיבוי מלא - ינואר 2024", size: "2.4 GB", createdAt: "2024-01-05 03:00", type: "full", status: "completed" },
  { id: "2", name: "גיבוי בסיס נתונים", size: "156 MB", createdAt: "2024-01-04 03:00", type: "database", status: "completed" },
  { id: "3", name: "גיבוי קבצים", size: "1.8 GB", createdAt: "2024-01-03 03:00", type: "files", status: "completed" },
  { id: "4", name: "גיבוי בסיס נתונים", size: "152 MB", createdAt: "2024-01-02 03:00", type: "database", status: "completed" },
];

const AdminBackup = () => {
  const [backups, setBackups] = useState<Backup[]>(mockBackups);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState({
    orders: true,
    customers: true,
    products: true,
    financial: true,
  });

  const startBackup = (type: "full" | "database" | "files") => {
    setIsBackingUp(true);
    setBackupProgress(0);
    
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          toast.success("הגיבוי הושלם בהצלחה");
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const exportData = () => {
    toast.success("הייצוא החל, הקובץ יורד בקרוב");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "full": return <HardDrive className="w-4 h-4" />;
      case "database": return <Database className="w-4 h-4" />;
      case "files": return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      full: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      database: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      files: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    const labels: Record<string, string> = {
      full: "מלא",
      database: "בסיס נתונים",
      files: "קבצים",
    };
    return <Badge className={styles[type]}>{labels[type]}</Badge>;
  };

  return (
    <AdminLayout title="גיבוי וייצוא" icon={HardDrive}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Four hand-rolled copies of AdminStatCard, each a dark slate card
              with its own gradient - a different theme from the panel they sit
              in. They are the component now, so they follow the design system
              instead of drifting from it. */}
          <AdminStatCard title="גיבויים שמורים" value={backups.length} icon={HardDrive} color="purple" />
          <AdminStatCard title="גיבוי אחרון" value="היום" icon={CheckCircle} color="success" />
          <AdminStatCard title="נפח כולל" value="4.5 GB" icon={Database} color="info" />
          <AdminStatCard title="גיבוי הבא" value="03:00" icon={Clock} color="warning" />
        </div>

        {/* Backup Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Backup */}
          <Card className="border border-mipo-line bg-mipo-surface">
            <CardHeader>
              <CardTitle className="text-mipo-ink flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-violet-400" />
                יצירת גיבוי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isBackingUp ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mipo-muted">מגבה...</span>
                    <span className="text-mipo-ink">{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="h-2" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => startBackup("full")}
                    className="flex-col h-auto py-4"
                  >
                    <HardDrive className="w-6 h-6 mb-2" />
                    <span>גיבוי מלא</span>
                  </Button>
                  <Button
                    onClick={() => startBackup("database")}
                    variant="outline"
                    className="flex-col h-auto py-4 border-mipo-line text-mipo-ink hover:bg-mipo-soft"
                  >
                    <Database className="w-6 h-6 mb-2" />
                    <span>בסיס נתונים</span>
                  </Button>
                  <Button
                    onClick={() => startBackup("files")}
                    variant="outline"
                    className="flex-col h-auto py-4 border-mipo-line text-mipo-ink hover:bg-mipo-soft"
                  >
                    <Image className="w-6 h-6 mb-2" />
                    <span>קבצים</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Data */}
          <Card className="border border-mipo-line bg-mipo-surface">
            <CardHeader>
              <CardTitle className="text-mipo-ink flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                ייצוא נתונים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="orders" 
                    checked={exportOptions.orders}
                    onCheckedChange={(c) => setExportOptions({...exportOptions, orders: !!c})}
                  />
                  <Label htmlFor="orders" className="text-mipo-ink">הזמנות</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="customers" 
                    checked={exportOptions.customers}
                    onCheckedChange={(c) => setExportOptions({...exportOptions, customers: !!c})}
                  />
                  <Label htmlFor="customers" className="text-mipo-ink">לקוחות</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="products" 
                    checked={exportOptions.products}
                    onCheckedChange={(c) => setExportOptions({...exportOptions, products: !!c})}
                  />
                  <Label htmlFor="products" className="text-mipo-ink">מוצרים</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="financial" 
                    checked={exportOptions.financial}
                    onCheckedChange={(c) => setExportOptions({...exportOptions, financial: !!c})}
                  />
                  <Label htmlFor="financial" className="text-mipo-ink">נתונים פיננסיים</Label>
                </div>
              </div>
              <Button onClick={exportData} className="mipo-cta-button w-full">
                <Download className="w-4 h-4 ml-2" />
                ייצא לקובץ Excel
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Backups List */}
        <Card className="border border-mipo-line bg-mipo-surface">
          <CardHeader className="border-b border-mipo-line/50">
            <CardTitle className="text-mipo-ink flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-violet-400" />
              היסטוריית גיבויים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-mipo-line">
              {backups.map((backup) => (
                <div key={backup.id} className="p-4 hover:bg-mipo-soft/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl border border-mipo-line flex items-center justify-center text-violet-400">
                        {getTypeIcon(backup.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-mipo-ink">{backup.name}</h3>
                        <p className="text-sm text-mipo-muted">{backup.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getTypeBadge(backup.type)}
                      <span className="text-sm text-mipo-muted">{backup.size}</span>
                      <Button size="sm" variant="outline" className="border-mipo-line text-mipo-ink">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBackup;