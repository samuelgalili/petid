import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminSearch, SearchResult } from '@/hooks/admin/useAdminSearch';
import { 
  LayoutDashboard, Users, ShoppingCart, Package, Flag, Heart, Store, FileText, 
  Settings, Bell, Shield, History, Bot, Wallet, ListTodo, Truck, UserPlus, 
  CreditCard, Boxes, Receipt, Megaphone, Users2, RotateCcw, BarChart3, Plug, 
  HardDrive, Contact, FolderTree, CalendarDays, Headphones, Building2, DollarSign,
  Webhook, PlaySquare, Trophy, Zap, Clock, Upload, Crown, MapPin, Ticket, Search,
  User, Target, ClipboardList
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard, Users, ShoppingCart, Package, Flag, Heart, Store, FileText,
  Settings, Bell, Shield, History, Bot, Wallet, ListTodo, Truck, UserPlus,
  CreditCard, Boxes, Receipt, Megaphone, Users2, RotateCcw, BarChart3, Plug,
  HardDrive, Contact, FolderTree, CalendarDays, Headphones, Building2, DollarSign,
  Webhook, PlaySquare, Trophy, Zap, Clock, Upload, Crown, MapPin, Ticket, Search,
  User, Target, ClipboardList
};

const typeIcons: Record<SearchResult['type'], React.ComponentType<any>> = {
  page: LayoutDashboard,
  user: User,
  order: ShoppingCart,
  product: Package,
  lead: Target,
  task: ClipboardList,
};

const typeLabels: Record<SearchResult['type'], string> = {
  page: 'עמוד',
  user: 'משתמש',
  order: 'הזמנה',
  product: 'מוצר',
  lead: 'ליד',
  task: 'משימה',
};

const typeColors: Record<SearchResult['type'], string> = {
  page: 'bg-primary/10 text-primary',
  user: 'bg-blue-500/10 text-blue-500',
  order: 'bg-green-500/10 text-green-500',
  product: 'bg-purple-500/10 text-purple-500',
  lead: 'bg-orange-500/10 text-orange-500',
  task: 'bg-yellow-500/10 text-yellow-500',
};

export const AdminGlobalSearch = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { 
    isOpen, 
    setIsOpen, 
    query, 
    search, 
    results, 
    isLoading, 
    selectedIndex, 
    selectResult,
    handleKeyDown,
  } = useAdminSearch();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !query) {
      search('');
    }
  }, [isOpen, query, search]);

  const getIcon = (result: SearchResult) => {
    if (result.icon && iconMap[result.icon]) {
      return iconMap[result.icon];
    }
    return typeIcons[result.type];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">חיפוש גלובלי</DialogTitle>
        </DialogHeader>
        
        <div className="relative border-b">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="חפש עמודים, משתמשים, הזמנות, מוצרים..."
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 pr-12 h-14 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              מחפש...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              לא נמצאו תוצאות
            </div>
          ) : (
            <div className="p-2">
              {results.map((result, index) => {
                const Icon = getIcon(result);
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => selectResult(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors",
                      isSelected ? "bg-accent" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", typeColors[result.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {typeLabels[result.type]}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↑↓</kbd>
              לניווט
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd>
              לבחירה
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">⌘K</kbd>
            לחיפוש
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
