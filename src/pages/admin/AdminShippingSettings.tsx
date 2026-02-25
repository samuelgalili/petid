import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight, Truck, Package, ToggleLeft, ToggleRight,
  Settings, Globe, MapPin, Key, RefreshCw, CheckCircle2,
  XCircle, Pencil, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminShippingSettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['shipping-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('shipping_providers' as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-providers'] });
      toast.success('ספק עודכן');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('shipping_providers' as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-providers'] });
      setEditingId(null);
      toast.success('הגדרות נשמרו');
    },
  });

  const startEdit = (provider: any) => {
    setEditingId(provider.id);
    setEditForm({
      api_base_url: provider.api_base_url || '',
      api_key: provider.config?.api_key || '',
      api_secret: provider.config?.api_secret || '',
    });
  };

  const saveEdit = (provider: any) => {
    updateMutation.mutate({
      id: provider.id,
      data: {
        api_base_url: editForm.api_base_url || null,
        config: {
          ...provider.config,
          api_key: editForm.api_key || undefined,
          api_secret: editForm.api_secret || undefined,
        },
      },
    });
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'international': return <Globe className="w-4 h-4" />;
      case 'local': return <MapPin className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <span className="text-lg font-bold tracking-tight">הגדרות משלוחים</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="ספקים פעילים"
            value={providers.filter((p: any) => p.is_active).length.toString()}
            icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
          />
          <StatCard
            label="בינלאומי"
            value={providers.filter((p: any) => p.provider_type === 'international').length.toString()}
            icon={<Globe className="w-4 h-4 text-muted-foreground" />}
          />
          <StatCard
            label="מקומי (ישראל)"
            value={providers.filter((p: any) => p.provider_type === 'local').length.toString()}
            icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
          />
        </div>

        {/* Providers List */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            SHIPPING PROVIDERS
          </p>
          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-[20px] bg-muted animate-pulse" />
              ))
            ) : (
              providers.map((provider: any, i: number) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="rounded-[20px] border-border/50 overflow-hidden">
                    <CardContent className="p-5">
                      {/* Provider Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${provider.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                            {getProviderIcon(provider.provider_type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{provider.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] border-0">
                                {provider.provider_type === 'international' ? 'בינלאומי' : 'מקומי'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {provider.supported_countries?.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={provider.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: provider.id, is_active: checked })
                            }
                          />
                        </div>
                      </div>

                      {/* API Status */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${provider.api_base_url ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                        <span className="text-muted-foreground">
                          {provider.api_base_url ? 'API מוגדר' : 'ללא API — מצב מקומי'}
                        </span>

                        {editingId !== provider.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mr-auto text-xs gap-1 h-7"
                            onClick={() => startEdit(provider)}
                          >
                            <Pencil className="w-3 h-3" />
                            הגדרות API
                          </Button>
                        ) : (
                          <div className="mr-auto flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs gap-1 h-7"
                              onClick={() => saveEdit(provider)}
                            >
                              <Save className="w-3 h-3" />
                              שמור
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Edit Form */}
                      {editingId === provider.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 space-y-2 border-t pt-3"
                        >
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">API Base URL</label>
                            <Input
                              value={editForm.api_base_url}
                              onChange={(e) => setEditForm({ ...editForm, api_base_url: e.target.value })}
                              placeholder="https://api.carrier.com/v2"
                              className="h-9 rounded-xl text-xs"
                              dir="ltr"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">API Key</label>
                              <Input
                                value={editForm.api_key}
                                onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                                placeholder="••••••••"
                                type="password"
                                className="h-9 rounded-xl text-xs"
                                dir="ltr"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">API Secret</label>
                              <Input
                                value={editForm.api_secret}
                                onChange={(e) => setEditForm({ ...editForm, api_secret: e.target.value })}
                                placeholder="••••••••"
                                type="password"
                                className="h-9 rounded-xl text-xs"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Info Card */}
        <Card className="rounded-[20px] border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 כשספק מופעל עם API מוגדר, המערכת תשתמש ב-API שלו ליצירת תוויות ומעקב.
              ללא API, המערכת תיצור תוויות מקומיות עם מספר מעקב פנימי.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-[20px] bg-card border border-border/50 p-4 text-center shadow-sm">
    <div className="flex items-center justify-center mb-2">{icon}</div>
    <p className="text-xl font-bold">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

export default AdminShippingSettings;
