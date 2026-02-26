import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users2, Search, Crown, Clock, Tag, Loader2 } from "lucide-react";

const AdminCustomerSegments = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ["customer-segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_segments")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const totalCustomers = segments.reduce((acc: number, s: any) => acc + (s.customer_count || 0), 0);

  const stats = [
    { title: "סה״כ סגמנטים", value: segments.length, icon: Tag, gradient: "from-violet-500 to-purple-600" },
    { title: "לקוחות מסווגים", value: totalCustomers.toLocaleString(), icon: Users2, gradient: "from-emerald-500 to-green-600" },
    { title: "VIP", value: segments.find((s: any) => s.name?.includes("VIP"))?.customer_count || 0, icon: Crown, gradient: "from-amber-500 to-orange-600" },
    { title: "לא פעילים", value: segments.find((s: any) => s.name?.includes("לא פעיל"))?.customer_count || 0, icon: Clock, gradient: "from-red-500 to-rose-600" },
  ];

  const filtered = segments.filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="פילוח לקוחות" icon={Users2}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש סגמנט..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">אין סגמנטים. הוסף סגמנטים דרך מסד הנתונים.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((segment: any) => {
              const criteria = Array.isArray(segment.criteria) ? segment.criteria : [];
              return (
                <Card key={segment.id} className="relative overflow-hidden group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${segment.color || "from-blue-500 to-cyan-600"} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity`} />
                  <CardContent className="p-5 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${segment.color || "from-blue-500 to-cyan-600"} flex items-center justify-center`}>
                        <Users2 className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-foreground mb-1">{segment.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{segment.description}</p>
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-2xl font-bold text-foreground">{(segment.customer_count || 0).toLocaleString()}</span>
                    </div>
                    {criteria.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-2">קריטריונים:</p>
                        <div className="flex flex-wrap gap-1">
                          {criteria.map((c: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomerSegments;
