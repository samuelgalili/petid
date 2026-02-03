import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Bot,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
  PawPrint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  isExpandable?: boolean;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
  { icon: Users, label: 'Customers', href: '/admin/crm' },
  { icon: Bot, label: 'AI Assistant', href: '/admin/ai-service' },
  { icon: BarChart3, label: 'Reports', href: '/admin/reports' },
  { icon: Settings, label: 'Settings', href: '/admin/settings', isExpandable: true },
];

export const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
          <PawPrint className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg">PetID</span>
          <span className="text-sky-400 text-lg font-light"> Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  isActive
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-sky-400" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="flex-1 font-medium">{item.label}</span>
                {item.isExpandable && (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-10 h-10 border-2 border-slate-600">
            <AvatarFallback className="bg-slate-700 text-white text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Jonathan Doe</p>
            <p className="text-xs text-slate-400 truncate">- Admin</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@petid.com'}</p>
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="flex items-center gap-2 mt-3 px-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
