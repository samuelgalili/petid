import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Shield, Store, Heart, Search, 
  ChevronLeft, Loader2, Plus, Trash2, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: AppRole[];
}

const AdminRoles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | 'all'>('all');

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to users
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

  // Add role mutation
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
      toast({ 
        title: 'שגיאה', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // Remove role mutation
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
      toast({ 
        title: 'שגיאה', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole);
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'business': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'org': return 'bg-green-500/10 text-green-500 border-green-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin': return <Shield className="w-3 h-3" />;
      case 'business': return <Store className="w-3 h-3" />;
      case 'org': return <Heart className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'מנהל';
      case 'business': return 'עסק';
      case 'org': return 'עמותה';
      default: return 'משתמש';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">אין הרשאה</h2>
          <p className="text-muted-foreground text-sm mb-4">
            רק מנהלים יכולים לגשת לעמוד זה
          </p>
          <Button onClick={() => navigate('/')}>חזרה לדף הבית</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="ניהול תפקידים" showBackButton />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {(['user', 'org', 'business', 'admin'] as AppRole[]).map(role => (
            <Card 
              key={role}
              className={`p-3 text-center cursor-pointer transition-all ${
                selectedRole === role ? 'ring-2 ring-accent' : ''
              }`}
              onClick={() => setSelectedRole(selectedRole === role ? 'all' : role)}
            >
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${getRoleBadgeColor(role)}`}>
                {getRoleIcon(role)}
              </div>
              <p className="text-xs font-medium">{getRoleLabel(role)}</p>
              <p className="text-lg font-bold">
                {users?.filter(u => u.roles.includes(role)).length || 0}
              </p>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש משתמשים..."
            className="pr-10"
          />
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredUsers?.map(user => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.full_name || 'ללא שם'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                        
                        {/* Current Roles */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user.roles.length === 0 ? (
                            <Badge variant="outline" className="text-xs">
                              אין תפקידים
                            </Badge>
                          ) : (
                            user.roles.map(role => (
                              <Badge 
                                key={role}
                                variant="outline"
                                className={`text-xs ${getRoleBadgeColor(role)}`}
                              >
                                {getRoleIcon(role)}
                                <span className="mr-1">{getRoleLabel(role)}</span>
                                {role !== 'user' && (
                                  <button
                                    onClick={() => removeRoleMutation.mutate({ userId: user.id, role })}
                                    className="mr-1 hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </Badge>
                            ))
                          )}
                        </div>

                        {/* Add Role */}
                        <div className="flex gap-2 mt-2">
                          <Select
                            onValueChange={(role) => {
                              if (!user.roles.includes(role as AppRole)) {
                                addRoleMutation.mutate({ userId: user.id, role: role as AppRole });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="הוסף תפקיד" />
                            </SelectTrigger>
                            <SelectContent>
                              {(['user', 'org', 'business', 'admin'] as AppRole[])
                                .filter(r => !user.roles.includes(r))
                                .map(role => (
                                  <SelectItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      {getRoleIcon(role)}
                                      {getRoleLabel(role)}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>לא נמצאו משתמשים</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoles;
