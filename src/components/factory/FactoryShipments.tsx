import { useState, useEffect } from "react";
import { Truck, Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  supplierId: string;
}

export const FactoryShipments = ({ supplierId }: Props) => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_shipments")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      setShipments(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const updateTracking = async (id: string, tracking: string) => {
    const { error } = await (supabase as any)
      .from("factory_shipments")
      .update({ tracking_number: tracking, status: "shipped", shipped_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      toast({ title: "Updated", description: "Tracking number saved" });
      setShipments(prev => prev.map(s => s.id === id ? { ...s, tracking_number: tracking, status: "shipped" } : s));
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  if (shipments.length === 0) {
    return (
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No shipments yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" /> Shipments ({shipments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shipments.map((s) => (
          <div key={s.id} className="bg-slate-700/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">{s.carrier || "No carrier"}</span>
              <Badge variant="outline" className="text-xs">{s.status}</Badge>
            </div>
            {!s.tracking_number ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tracking number..."
                  className="bg-slate-600/50 border-slate-500 text-white text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateTracking(s.id, (e.target as HTMLInputElement).value);
                  }}
                />
                <Button size="sm" className="bg-emerald-600 text-white" onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input?.value) updateTracking(s.id, input.value);
                }}>Save</Button>
              </div>
            ) : (
              <p className="text-xs text-emerald-400">📦 {s.tracking_number}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
