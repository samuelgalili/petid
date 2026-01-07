import { useState } from "react";
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

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  duration: number;
  type: 'meeting' | 'call' | 'task' | 'reminder';
  attendees?: string[];
  location?: string;
  color: string;
}

const AdminCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');

  const events: Event[] = [
    {
      id: '1',
      title: 'פגישה עם ספק',
      date: new Date(),
      time: '10:00',
      duration: 60,
      type: 'meeting',
      attendees: ['יוסי כהן', 'משה לוי'],
      location: 'משרד ראשי',
      color: 'bg-blue-500'
    },
    {
      id: '2',
      title: 'שיחה עם לקוח VIP',
      date: new Date(),
      time: '14:00',
      duration: 30,
      type: 'call',
      attendees: ['דני אברהם'],
      color: 'bg-green-500'
    },
    {
      id: '3',
      title: 'סקירת מלאי חודשית',
      date: addDays(new Date(), 1),
      time: '09:00',
      duration: 120,
      type: 'task',
      color: 'bg-purple-500'
    },
    {
      id: '4',
      title: 'הזמנה מספק - תזכורת',
      date: addDays(new Date(), 2),
      time: '11:00',
      duration: 15,
      type: 'reminder',
      color: 'bg-orange-500'
    }
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { locale: he }), i)
  );

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

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
    return events.filter(event => isSameDay(event.date, date));
  };

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
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">אירועים השבוע</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">פגישות היום</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">שיחות מתוכננות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">תזכורות פעילות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mini Calendar */}
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
                {events.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className={`w-2 h-2 rounded-full ${event.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.date, 'dd/MM')} - {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Week View */}
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
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
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

                  {/* Time Grid */}
                  {hours.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                      <div className="p-2 text-center text-sm text-muted-foreground border-l">
                        {hour}:00
                      </div>
                      {weekDays.map((day, dayIndex) => {
                        const dayEvents = getEventsForDate(day).filter(
                          e => parseInt(e.time.split(':')[0]) === hour
                        );
                        return (
                          <div key={dayIndex} className="border-r p-1 relative">
                            {dayEvents.map((event) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`${event.color} text-white p-2 rounded text-xs cursor-pointer hover:opacity-90`}
                              >
                                <div className="flex items-center gap-1">
                                  {getEventIcon(event.type)}
                                  <span className="font-medium truncate">{event.title}</span>
                                </div>
                                <p className="opacity-80">{event.time}</p>
                              </motion.div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Events Detail */}
        <Card>
          <CardHeader>
            <CardTitle>אירועי היום - {format(new Date(), 'EEEE, dd בMMMM', { locale: he })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getEventsForDate(new Date()).length > 0 ? (
                getEventsForDate(new Date()).map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className={`w-1 h-16 rounded-full ${event.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventIcon(event.type)}
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant="secondary">{event.duration} דקות</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.time}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                        {event.attendees && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.attendees.join(', ')}
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
