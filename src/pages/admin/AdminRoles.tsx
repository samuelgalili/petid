import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Shield, Store, Heart, Search, 
  ArrowLeft, Loader2, Plus, Trash2, AlertCircle,
  Edit, Mail, MessageSquare, RefreshCw, MoreVertical,
  Crown, UserCheck, Building2,
} from 'lucide-react';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: AppRole[];
  created_at?: string;
}

const roleConfig: Record<AppRole, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  admin: { label: "מנהל", color: "text-red-100", bgColor: "bg-red-500", icon: <Shield className="w-4 h-4" /> },
  moderator: { label: "מנהל תוכן", color: "text-orange-100", bgColor: "bg-orange-500", icon: <Crown className="w-4 h-4" /> },
  business: { label: "עסק", color: "text-blue-100", bgColor: "bg-blue-500", icon: <Building2 className="w-4 h-4" /> },
  org: { label: "עמותה", color: "text-green-100", bgColor: "bg-green-500", icon: <Heart className="w-4 h-4" /> },
  user: { label: "משתמש", color: "text-slate-100", bgColor: "bg-slate-600", icon: <UserCheck className="w-4 h-4" /> },
};

const AdminRoles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | 'all'>('all');

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole)
      }));

      return usersWithRoles;
    },
    enabled: isAdmin,
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as 'admin' | 'user' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-roles'] });
      toast({ title: 'התפקיד נוסף בהצלחה' });
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as 'admin' | 'user');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-roles'] });
      toast({ title: 'התפקיד הוסר בהצלחה' });
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole);
    return matchesSearch && matchesRole;
  });

  const getRoleCount = (role: AppRole) => users?.filter(u => u.roles.includes(role)).length || 0;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center" dir="rtl">
        <Card className="p-6 text-center max-w-sm bg-slate-800 border-slate-700">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">אין הרשאה</h2>
          <p className="text-slate-400 text-sm mb-4">רק מנהלים יכולים לגשת לעמוד זה</p>
          <Button onClick={() => navigate('/')} className="bg-cyan-500 hover:bg-cyan-600">חזרה לדף הבית</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">NARTINA</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2">
              <Plus className="w-4 h-4" />
              הוסף תפקיד
            </Button>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole | 'all')}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="כל התפקידים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                {Object.entries(roleConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="חיפוש לפי שם או אימייל..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pr-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400" 
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-5 gap-3">
        {Object.entries(roleConfig).map(([key, config]) => (
          <Card 
            key={key} 
            className={`${config.bgColor} border-none p-4 cursor-pointer transition-all ${selectedRole === key ? 'ring-2 ring-white' : ''}`}
            onClick={() => setSelectedRole(selectedRole === key ? 'all' : key as AppRole)}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                {config.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{getRoleCount(key as AppRole)}</p>
                <p className="text-sm text-white/80">{config.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="px-4">
        <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_200px_1fr_auto_auto_auto_auto_80px] gap-2 px-4 py-3 bg-slate-800 text-slate-400 text-sm font-medium border-b border-slate-700">
            <div></div>
            <div>שם משתמש</div>
            <div>אימייל</div>
            <div>תפקידים</div>
            <div>הוסף תפקיד</div>
            <div>מייל</div>
            <div>הודעה</div>
            <div>עריכה</div>
            <div></div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p>לא נמצאו משתמשים</p>
            </div>
          ) : (
            filteredUsers?.map((user, index) => {
              const hasAdmin = user.roles.includes('admin');
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="grid grid-cols-[auto_1fr_200px_1fr_auto_auto_auto_auto_80px] gap-2 px-4 py-3 items-center border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors relative"
                >
                  {/* Left Color Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1 ${hasAdmin ? 'bg-red-500' : user.roles.includes('business') ? 'bg-blue-500' : 'bg-emerald-500'}`} />

                  {/* Avatar */}
                  <div className="pr-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Name */}
                  <div className="text-white font-medium">{user.full_name || 'ללא שם'}</div>

                  {/* Email */}
                  <div className="text-slate-300 text-sm truncate">{user.email}</div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <Badge variant="outline" className="text-xs border-slate-500 text-slate-400">אין תפקידים</Badge>
                    ) : (
                      user.roles.map(role => {
                        const config = roleConfig[role];
                        return (
                          <Badge 
                            key={role}
                            className={`${config.bgColor} ${config.color} border-none text-xs flex items-center gap-1`}
                          >
                            {config.icon}
                            {config.label}
                            {role !== 'user' && (
                              <button
                                onClick={() => removeRoleMutation.mutate({ userId: user.id, role })}
                                className="mr-1 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        );
                      })
                    )}
                  </div>

                  {/* Add Role Select */}
                  <div>
                    <Select
                      onValueChange={(role) => {
                        if (!user.roles.includes(role as AppRole)) {
                          addRoleMutation.mutate({ userId: user.id, role });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-white w-28">
                        <SelectValue placeholder="+ תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleConfig)
                          .filter(([key]) => !user.roles.includes(key as AppRole))
                          .map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mail Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Message Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-purple-600 hover:bg-purple-500 text-white">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Edit Button */}
                  <div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 text-white">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Indicator */}
                  <div className="flex justify-center">
                    <div className={`w-3 h-3 rounded-full ${hasAdmin ? 'bg-red-500' : user.roles.includes('business') ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;
