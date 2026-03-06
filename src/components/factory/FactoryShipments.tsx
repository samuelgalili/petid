import { useState, useEffect } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props { supplierId: string; }

export const FactoryShipments = ({ supplierId }: Props) => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_shipments").select("*")
        .eq("supplier_id", supplierId).order("created_at", { ascending: false });
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

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (shipments.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted-foreground">No shipments yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-foreground">
          <Truck className="w-4 h-4 text-primary" strokeWidth={1.5} /> Shipments ({shipments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {shipments.map((s) => (
          <div key={s.id} className="bg-muted/50 rounded-xl p-4 space-y-2 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{s.carrier || "No carrier"}</span>
              <Badge variant="outline" className="text-xs">{s.status}</Badge>
            </div>
            {!s.tracking_number ? (
              <div className="flex gap-2">
                <Input placeholder="Enter tracking number..." className="text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") updateTracking(s.id, (e.target as HTMLInputElement).value); }} />
                <Button size="sm" onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input?.value) updateTracking(s.id, input.value);
                }}>Save</Button>
              </div>
            ) : (
              <p className="text-xs text-primary">📦 {s.tracking_number}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
