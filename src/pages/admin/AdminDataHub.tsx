import { useState, useEffect, useCallback } from "react";
import { Database, Dog, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin";
import { DataHubHeader } from "@/components/admin/data-hub/DataHubHeader";
import { DataHubTabs } from "@/components/admin/data-hub/DataHubTabs";
import { DataSourceList } from "@/components/admin/data-hub/DataSourceList";
import { DataUploadDialog } from "@/components/admin/data-hub/DataUploadDialog";
import { BreedsList } from "@/components/admin/data-hub/BreedsList";
import { DataAlertsBell } from "@/components/admin/data-hub/DataAlertsBell";
import { DataHealthDashboard } from "@/components/admin/data-hub/DataHealthDashboard";
import { DataSourceType, DataSource } from "@/types/admin-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDataHub = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<DataSourceType>("breeds");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"health" | "data" | "sources">("health");

  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_data_sources")
        .select("*")
        .eq("data_type", activeTab)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDataSources((data as unknown as DataSource[]) || []);
    } catch (error: any) {
      console.error("Error fetching data sources:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const handleDeleteSource = async (id: string, fileUrl?: string) => {
    try {
      if (fileUrl) {
        const path = fileUrl.split("/").pop();
        if (path) {
          await supabase.storage.from("admin-data").remove([path]);
        }
      }

      const { error } = await supabase
        .from("admin_data_sources")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "נמחק בהצלחה",
        description: "מקור הנתונים הוסר מהמערכת",
      });
      fetchDataSources();
    } catch (error: any) {
      console.error("Error deleting source:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את מקור הנתונים",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("admin_data_sources")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      fetchDataSources();
    } catch (error: any) {
      console.error("Error toggling source:", error);
    }
  };

  return (
    <AdminLayout title="Data Hub" icon={Database}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <DataHubHeader onUpload={() => setUploadDialogOpen(true)} />
          <DataAlertsBell />
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "health" | "data" | "sources")} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="health" className="gap-2">
              <Activity className="w-4 h-4" />
              בריאות
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Dog className="w-4 h-4" />
              נתונים
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2">
              <Database className="w-4 h-4" />
              מקורות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-4">
            <DataHealthDashboard />
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            {activeTab === "breeds" && <BreedsList />}
            {activeTab !== "breeds" && (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>תצוגת נתונים זמינה רק לגזעים כרגע</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-4">
            <DataHubTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <DataSourceList
              sources={dataSources}
              loading={loading}
              onDelete={handleDeleteSource}
              onToggleActive={handleToggleActive}
              onRefresh={fetchDataSources}
            />
          </TabsContent>
        </Tabs>
      </div>

      <DataUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        dataType={activeTab}
        onSuccess={fetchDataSources}
      />
    </AdminLayout>
  );
};

export default AdminDataHub;
