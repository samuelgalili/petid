import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CalendarDays, 
  Clock, 
  Plus,
  Users,
  Video,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Edit
} from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "meeting",
    start_time: "",
    end_time: "",
    location: "",
    color: "bg-blue-500"
  });
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const { error } = await supabase
        .from('calendar_events')
        .insert(eventData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setIsEventDialogOpen(false);
      setNewEvent({ title: "", description: "", event_type: "meeting", start_time: "", end_time: "", location: "", color: "bg-blue-500" });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setEditingEvent(null);
    }
  });

  const baseWeekStart = startOfWeek(selectedDate, { locale: he });
  const adjustedWeekStart = addDays(baseWeekStart, weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(adjustedWeekStart, i)
  );

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventsForDate = (date: Date) => {
    return events?.filter(event => 
      isSameDay(new Date(event.start_time), date)
    ) || [];
  };

  const getEventsForHour = (date: Date, hour: number) => {
    return getEventsForDate(date).filter(event => {
      const eventHour = new Date(event.start_time).getHours();
      return eventHour === hour;
    });
  };

  const todayEvents = getEventsForDate(new Date());
  const upcomingEvents = events?.filter(e => new Date(e.start_time) > new Date()).slice(0, 5) || [];

  return (
    <AdminLayout title="יומן ותזמון">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">יומן ותזמון</h1>
            <p className="text-muted-foreground">ניהול פגישות, משימות ותזכורות</p>
          </div>
          <Button className="gap-2" onClick={() => setIsEventDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            אירוע חדש
          </Button>
        </div>

        {/* New Event Dialog */}
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>אירוע חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>כותרת</Label>
                <Input 
                  value={newEvent.title} 
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>תיאור</Label>
                <Textarea 
                  value={newEvent.description} 
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סוג</Label>
                  <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">פגישה</SelectItem>
                      <SelectItem value="call">שיחה</SelectItem>
                      <SelectItem value="video">וידאו</SelectItem>
                      <SelectItem value="reminder">תזכורת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>מיקום</Label>
                  <Input 
                    value={newEvent.location} 
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>התחלה</Label>
                  <Input 
                    type="datetime-local" 
                    value={newEvent.start_time} 
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>סיום</Label>
                  <Input 
                    type="datetime-local" 
                    value={newEvent.end_time} 
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} 
                  />
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => {
                  if (!newEvent.title || !newEvent.start_time) {
                    toast.error('נא למלא כותרת ותאריך התחלה');
                    return;
                  }
                  createEventMutation.mutate({
                    title: newEvent.title,
                    description: newEvent.description,
                    event_type: newEvent.event_type,
                    start_time: newEvent.start_time,
                    end_time: newEvent.end_time || null,
                    location: newEvent.location || null,
                    color: newEvent.color
                  });
                  toast.success('האירוע נוצר בהצלחה');
                }}
                disabled={!newEvent.title || !newEvent.start_time}
              >
                צור אירוע
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת אירוע</DialogTitle>
            </DialogHeader>
            {editingEvent && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>כותרת</Label>
                  <Input 
                    value={editingEvent.title} 
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Textarea 
                    value={editingEvent.description || ""} 
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>סוג</Label>
                    <Select value={editingEvent.event_type || "meeting"} onValueChange={(v) => setEditingEvent({ ...editingEvent, event_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">פגישה</SelectItem>
                        <SelectItem value="call">שיחה</SelectItem>
                        <SelectItem value="video">וידאו</SelectItem>
                        <SelectItem value="reminder">תזכורת</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>מיקום</Label>
                    <Input 
                      value={editingEvent.location || ""} 
                      onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} 
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    updateEventMutation.mutate({
                      id: editingEvent.id,
                      data: {
                        title: editingEvent.title,
                        description: editingEvent.description,
                        event_type: editingEvent.event_type,
                        location: editingEvent.location
                      }
                    });
                    toast.success('האירוע עודכן');
                  }}
                >
                  שמור שינויים
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events?.length || 0}</p>
                <p className="text-sm text-muted-foreground">אירועים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayEvents.length}</p>
                <p className="text-sm text-muted-foreground">היום</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events?.filter(e => e.event_type === 'call').length || 0}</p>
                <p className="text-sm text-muted-foreground">שיחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events?.filter(e => e.event_type === 'reminder').length || 0}</p>
                <p className="text-sm text-muted-foreground">תזכורות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                לוח שנה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
              
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">אירועים קרובים</h4>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין אירועים קרובים</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div className={`w-2 h-2 rounded-full ${event.color || 'bg-blue-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.start_time), 'dd/MM HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>תצוגת שבוע</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setWeekOffset(prev => prev - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[150px] text-center">
                    {format(weekDays[0], 'dd/MM', { locale: he })} - {format(weekDays[6], 'dd/MM', { locale: he })}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setWeekOffset(prev => prev + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-96 bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 border-b">
                      <div className="p-2 text-center text-sm text-muted-foreground">שעה</div>
                      {weekDays.map((day, index) => (
                        <div 
                          key={index} 
                          className={`p-2 text-center border-r ${
                            isSameDay(day, new Date()) ? 'bg-primary/10' : ''
                          }`}
                        >
                          <p className="font-medium">{format(day, 'EEEE', { locale: he })}</p>
                          <p className="text-sm text-muted-foreground">{format(day, 'dd/MM')}</p>
                        </div>
                      ))}
                    </div>

                    {hours.map((hour) => (
                      <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                        <div className="p-2 text-center text-sm text-muted-foreground border-l">
                          {hour}:00
                        </div>
                        {weekDays.map((day, dayIndex) => {
                          const hourEvents = getEventsForHour(day, hour);
                          return (
                            <div key={dayIndex} className="border-r p-1 relative">
                              {hourEvents.map((event) => (
                                <motion.div
                                  key={event.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`${event.color || 'bg-blue-500'} text-white p-2 rounded text-xs cursor-pointer hover:opacity-90`}
                                >
                                  <div className="flex items-center gap-1">
                                    {getEventIcon(event.event_type)}
                                    <span className="font-medium truncate">{event.title}</span>
                                  </div>
                                  <p className="opacity-80">{format(new Date(event.start_time), 'HH:mm')}</p>
                                </motion.div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>אירועי היום - {format(new Date(), 'EEEE, dd בMMMM', { locale: he })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayEvents.length > 0 ? (
                todayEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className={`w-1 h-16 rounded-full ${event.color || 'bg-blue-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventIcon(event.event_type)}
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant="secondary">{event.event_type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.start_time), 'HH:mm')}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                        <Edit className="h-4 w-4 ml-1" />
                        עריכה
                      </Button>
                      <Button size="sm" onClick={() => {
                        if (event.location) {
                          window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank');
                        } else {
                          toast.info('לא הוגדר מיקום לאירוע זה');
                        }
                      }}>
                        הצטרף
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">אין אירועים מתוכננים להיום</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
