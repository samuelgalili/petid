import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  MoreVertical,
  Mail,
  Phone,
  MessageCircle,
  Tag,
  Star,
  Clock,
  TrendingUp,
  Eye,
  UserCheck,
  Ban,
  RefreshCw,
  Crown,
  Building2,
  Heart,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AdminToolbar, 
  AdminStatusBadge, 
  AdminStatCard, 
  AdminStatsGrid,
  AdminEmptyState,
} from "@/components/admin/AdminStyles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomerData {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  blocked_at: string | null;
  roles: string[];
}

const roleConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  admin: { label: "מנהל", color: "text-rose-700", bgColor: "bg-rose-500/10", icon: <Shield className="w-3 h-3" /> },
  moderator: { label: "מנהל תוכן", color: "text-orange-700", bgColor: "bg-orange-500/10", icon: <Crown className="w-3 h-3" /> },
  business: { label: "עסק", color: "text-blue-700", bgColor: "bg-blue-500/10", icon: <Building2 className="w-3 h-3" /> },
  org: { label: "עמותה", color: "text-emerald-700", bgColor: "bg-emerald-500/10", icon: <Heart className="w-3 h-3" /> },
  user: { label: "משתמש", color: "text-slate-700", bgColor: "bg-slate-500/10", icon: <UserCheck className="w-3 h-3" /> },
};

const AICustomers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["ai-service-customers"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at, blocked_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      return (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role),
      })) as CustomerData[];
    },
  });

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase());
    
    if (roleFilter === "all") return matchesSearch;
    if (roleFilter === "blocked") return matchesSearch && customer.blocked_at;
    if (roleFilter === "vip") return matchesSearch && customer.roles.includes('business');
    return matchesSearch && customer.roles.includes(roleFilter);
  });

  const activeCustomers = customers.filter(c => !c.blocked_at).length;
  const blockedCustomers = customers.filter(c => c.blocked_at).length;
  const businessCustomers = customers.filter(c => c.roles.includes('business')).length;
  const newThisWeek = customers.filter(c => {
    if (!c.created_at) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(c.created_at) >= weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <AdminStatsGrid>
        <AdminStatCard
          title="סה״כ לקוחות"
          value={customers.length}
          icon={Users}
          color="primary"
          trend={{ value: "12%", isPositive: true }}
        />
        <AdminStatCard
          title="פעילים"
          value={activeCustomers}
          icon={UserCheck}
          color="success"
        />
        <AdminStatCard
          title="לקוחות עסקיים"
          value={businessCustomers}
          icon={Building2}
          color="info"
        />
        <AdminStatCard
          title="חדשים השבוע"
          value={newThisWeek}
          icon={TrendingUp}
          color="cyan"
          trend={{ value: `${newThisWeek}`, isPositive: true }}
        />
      </AdminStatsGrid>

      {/* Toolbar */}
      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="חיפוש לקוחות..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onExport={() => {}}
      >
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="סינון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            <SelectItem value="business">עסקיים</SelectItem>
            <SelectItem value="blocked">חסומים</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </AdminToolbar>

      {/* Customers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="לא נמצאו לקוחות"
          description={search ? "נסה לשנות את החיפוש" : "אין לקוחות במערכת"}
        />
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer, index) => {
            const isBlocked = !!customer.blocked_at;
            const isBusiness = customer.roles.includes('business');

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={cn(
                  "hover:shadow-md transition-all border",
                  isBlocked ? 'border-rose-200 bg-rose-50/50' : 'border-border/50'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={customer.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {customer.full_name?.charAt(0) || customer.email?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{customer.full_name || "ללא שם"}</p>
                          {isBlocked && (
                            <AdminStatusBadge status="danger" label="חסום" />
                          )}
                          {isBusiness && (
                            <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30 text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              עסק
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customer.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">לקוח</span>
                          ) : (
                            customer.roles.map((role) => {
                              const config = roleConfig[role] || roleConfig.user;
                              return (
                                <span key={role} className={cn("text-xs px-2 py-0.5 rounded flex items-center gap-1", config.bgColor, config.color)}>
                                  {config.icon}
                                  {config.label}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="hidden md:flex flex-col items-end text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {customer.created_at ? format(new Date(customer.created_at), "dd/MM/yyyy", { locale: he }) : "-"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => navigate(`/user/${customer.id}`)}
                          title="צפה בפרופיל"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => navigate(`/messages/${customer.id}`)}
                          title="שלח הודעה"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => navigate(`/user/${customer.id}`)}>
                              <Eye className="w-4 h-4" />
                              צפה בפרופיל
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => navigate(`/messages/${customer.id}`)}>
                              <MessageCircle className="w-4 h-4" />
                              שלח הודעה
                            </DropdownMenuItem>
                            {customer.email && (
                              <DropdownMenuItem className="gap-2" onClick={() => window.location.href = `mailto:${customer.email}`}>
                                <Mail className="w-4 h-4" />
                                שלח אימייל
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2">
                              <Tag className="w-4 h-4" />
                              הוסף תגית
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AICustomers;
