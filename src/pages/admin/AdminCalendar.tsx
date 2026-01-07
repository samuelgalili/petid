import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarDays, 
  Clock, 
  Plus,
  Users,
  Video,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { he } from "date-fns/locale";

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { locale: he }), i)
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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            אירוע חדש
          </Button>
        </div>

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
                  <Button variant="outline" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[150px] text-center">
                    {format(weekDays[0], 'dd/MM', { locale: he })} - {format(weekDays[6], 'dd/MM', { locale: he })}
                  </span>
                  <Button variant="outline" size="icon">
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
                      <Button variant="outline" size="sm">עריכה</Button>
                      <Button size="sm">הצטרף</Button>
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
