/**
 * Admin Pet Services - Manage insurance, training, grooming, boarding, breed info
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  GraduationCap, 
  Scissors, 
  Building2, 
  Info, 
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Calendar,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

type ServiceTab = 'insurance' | 'training' | 'grooming' | 'boarding' | 'breed_info' | 'bookings';

const AdminPetServices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ServiceTab>('insurance');

  // Fetch grooming bookings
  const { data: groomingBookings } = useQuery({
    queryKey: ['admin-grooming-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_grooming_bookings')
        .select(`
          *,
          pet_grooming_services(name, price)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch boarding bookings
  const { data: boardingBookings } = useQuery({
    queryKey: ['admin-boarding-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pet_boarding_bookings')
        .select(`
          *,
          pet_boarding_services(name, price_per_night)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Approve/reject booking mutations
  const approveGroomingMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from('pet_grooming_bookings')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grooming-bookings'] });
      toast({ title: 'הסטטוס עודכן' });
    },
  });

  const approveBoardingMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from('pet_boarding_bookings')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boarding-bookings'] });
      toast({ title: 'הסטטוס עודכן' });
    },
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  const statusLabels: Record<string, string> = {
    pending: 'ממתין',
    approved: 'אושר',
    rejected: 'נדחה',
    completed: 'הושלם',
  };

  return (
    <AdminLayout title="שירותי חיות מחמד" breadcrumbs={[{ label: "שירותי חיות מחמד" }]}>
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ניהול שירותי חיות מחמד</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ServiceTab)}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="insurance" className="text-xs">
              <Shield className="w-4 h-4 ml-1" />
              ביטוח
            </TabsTrigger>
            <TabsTrigger value="training" className="text-xs">
              <GraduationCap className="w-4 h-4 ml-1" />
              אילוף
            </TabsTrigger>
            <TabsTrigger value="grooming" className="text-xs">
              <Scissors className="w-4 h-4 ml-1" />
              טיפוח
            </TabsTrigger>
            <TabsTrigger value="boarding" className="text-xs">
              <Building2 className="w-4 h-4 ml-1" />
              פנסיון
            </TabsTrigger>
            <TabsTrigger value="breed_info" className="text-xs">
              <Info className="w-4 h-4 ml-1" />
              גזעים
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs">
              <Calendar className="w-4 h-4 ml-1" />
              הזמנות
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab - For approving grooming/boarding */}
          <TabsContent value="bookings" className="space-y-6">
            {/* Grooming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  הזמנות טיפוח
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groomingBookings?.length ? (
                  <div className="space-y-3">
                    {groomingBookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                        <div>
                          <p className="font-medium">{booking.pet_grooming_services?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.requested_date), 'PPP', { locale: he })}
                          </p>
                          <p className="text-sm">₪{booking.total_price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                          {booking.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => approveGroomingMutation.mutate({ id: booking.id, approved: true })}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => approveGroomingMutation.mutate({ id: booking.id, approved: false })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">אין הזמנות טיפוח</p>
                )}
              </CardContent>
            </Card>

            {/* Boarding Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  הזמנות פנסיון
                </CardTitle>
              </CardHeader>
              <CardContent>
                {boardingBookings?.length ? (
                  <div className="space-y-3">
                    {boardingBookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                        <div>
                          <p className="font-medium">{booking.pet_boarding_services?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_date), 'P', { locale: he })} - {format(new Date(booking.end_date), 'P', { locale: he })}
                          </p>
                          <p className="text-sm">{booking.total_nights} לילות • ₪{booking.total_price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status]}`}>
                            {statusLabels[booking.status]}
                          </span>
                          {booking.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => approveBoardingMutation.mutate({ id: booking.id, approved: true })}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => approveBoardingMutation.mutate({ id: booking.id, approved: false })}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">אין הזמנות פנסיון</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder for other tabs - Add forms for managing services */}
          <TabsContent value="insurance">
            <Card>
              <CardHeader>
                <CardTitle>ניהול פוליסות ביטוח</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">כאן תוכל להוסיף ולערוך פוליסות ביטוח לחיות מחמד</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פוליסה
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>ניהול תוכניות אילוף</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">כאן תוכל להוסיף ולערוך תוכניות אילוף</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף תוכנית
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grooming">
            <Card>
              <CardHeader>
                <CardTitle>ניהול שירותי טיפוח</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">כאן תוכל להוסיף ולערוך שירותי טיפוח</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף שירות
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="boarding">
            <Card>
              <CardHeader>
                <CardTitle>ניהול פנסיונים</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">כאן תוכל להוסיף ולערוך פנסיונים</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פנסיון
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breed_info">
            <Card>
              <CardHeader>
                <CardTitle>ניהול מידע על גזעים</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">כאן תוכל להוסיף ולערוך מידע מחקרי על גזעים</p>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף גזע
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPetServices;
