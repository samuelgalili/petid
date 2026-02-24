import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminNotifications, AdminAlert } from "@/hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const getLinkByCategory = (category: string) => {
  switch (category) {
    case 'insurance': return '/admin/pet-services';
    case 'moderation': return '/admin/reports';
    case 'adoption': return '/admin/adoption';
    case 'sales': return '/admin/orders';
    default: return '/admin/notifications';
  }
};

export const AdminNotificationsBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-9 h-9">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0">התראות ({unreadCount})</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
              onClick={markAllAsRead}
            >
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4 text-center">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">אין התראות חדשות</p>
              <p className="text-xs opacity-70 mt-1">אתה מעודכן בהכל!</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-3 mx-1 my-0.5 rounded-lg cursor-pointer ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    navigate(getLinkByCategory(notification.category));
                  }}
                >
                  <div className="flex w-full justify-between items-start gap-2">
                    <span className="font-medium text-sm">{notification.title}</span>
                    {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: he })}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator className="my-0" />
        <div className="p-2 bg-muted/30">
          <Button 
            variant="ghost" 
            className="w-full text-xs h-8 justify-center text-muted-foreground"
            onClick={() => navigate('/admin/notifications')}
          >
            צפה בכל ההתראות
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
