import { useState, useEffect } from "react";
import { 
  History, 
  ChevronDown, 
  ChevronUp,
  User,
  Clock,
  Edit,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ProductHistoryProps {
  productId: string;
}

interface HistoryEntry {
  id: string;
  action_type: string;
  admin_id: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

export function ProductHistory({ productId }: ProductHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('entity_type', 'product')
        .eq('entity_id', productId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetchHistory();
    }
  }, [expanded]);

  const getActionIcon = (type: string) => {
    if (type.includes('created')) return <Plus className="h-3 w-3 text-green-500" />;
    if (type.includes('deleted')) return <Trash2 className="h-3 w-3 text-red-500" />;
    return <Edit className="h-3 w-3 text-blue-500" />;
  };

  const getActionLabel = (type: string) => {
    if (type.includes('created')) return 'נוצר';
    if (type.includes('deleted')) return 'נמחק';
    if (type.includes('updated')) return 'עודכן';
    return type;
  };

  const formatChanges = (oldVals: any, newVals: any) => {
    if (!oldVals && newVals) return 'מוצר חדש';
    if (!newVals) return 'נמחק';
    
    const changes: string[] = [];
    
    if (oldVals && newVals) {
      Object.keys(newVals).forEach(key => {
        if (oldVals[key] !== newVals[key]) {
          const fieldName = {
            name: 'שם',
            price: 'מחיר',
            description: 'תיאור',
            category: 'קטגוריה',
            in_stock: 'מלאי',
            is_featured: 'מקודם'
          }[key] || key;
          changes.push(fieldName);
        }
      });
    }
    
    return changes.length > 0 ? `שונה: ${changes.join(', ')}` : 'עודכן';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <Button
          variant="ghost"
          className="w-full justify-between p-0 h-auto"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            היסטוריית שינויים
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              אין היסטוריה
            </p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {history.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-start gap-3 p-2 rounded border bg-muted/30"
                  >
                    <div className="mt-1">
                      {getActionIcon(entry.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getActionLabel(entry.action_type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatChanges(entry.old_values, entry.new_values)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString('he-IL')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}
