import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Tag,
  Star,
  Clock,
  TrendingUp,
  ShoppingCart,
  Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminToolbar, AdminStatusBadge } from "@/components/admin/AdminStyles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const customers = [
  {
    id: 1,
    name: "שרה לוי",
    email: "sarah@email.com",
    phone: "050-1234567",
    status: "active",
    conversations: 12,
    lastContact: "היום 10:45",
    totalSpent: 2450,
    tags: ["VIP", "חוזר"],
    satisfaction: 5,
    channel: "whatsapp"
  },
  {
    id: 2,
    name: "דניאל כהן",
    email: "daniel@email.com",
    phone: "052-9876543",
    status: "lead",
    conversations: 3,
    lastContact: "היום 10:42",
    totalSpent: 0,
    tags: ["ליד חם"],
    satisfaction: null,
    channel: "web"
  },
  {
    id: 3,
    name: "מיכל אברהם",
    email: "michal@email.com",
    phone: "054-5555555",
    status: "active",
    conversations: 8,
    lastContact: "אתמול 14:20",
    totalSpent: 1890,
    tags: ["תלונה פתוחה"],
    satisfaction: 3,
    channel: "facebook"
  },
  {
    id: 4,
    name: "יוסי רוזנברג",
    email: "yossi@email.com",
    phone: "053-1111111",
    status: "inactive",
    conversations: 2,
    lastContact: "לפני שבוע",
    totalSpent: 450,
    tags: [],
    satisfaction: 4,
    channel: "instagram"
  },
  {
    id: 5,
    name: "רחל גולדשטיין",
    email: "rachel@email.com",
    phone: "058-2222222",
    status: "active",
    conversations: 25,
    lastContact: "היום 09:15",
    totalSpent: 5670,
    tags: ["VIP", "שותף עסקי"],
    satisfaction: 5,
    channel: "whatsapp"
  },
];

const AICustomers = () => {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);

  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(search) || 
    customer.email.includes(search) ||
    customer.phone.includes(search)
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active": return { label: "פעיל", type: "active" as const };
      case "lead": return { label: "ליד", type: "info" as const };
      case "inactive": return { label: "לא פעיל", type: "inactive" as const };
      default: return { label: status, type: "info" as const };
    }
  };

  const getTagColor = (tag: string) => {
    if (tag === "VIP") return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    if (tag === "ליד חם") return "bg-rose-500/10 text-rose-600 border-rose-500/30";
    if (tag === "תלונה פתוחה") return "bg-orange-500/10 text-orange-600 border-orange-500/30";
    if (tag === "שותף עסקי") return "bg-purple-500/10 text-purple-600 border-purple-500/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="חיפוש לקוחות..."
        onFilter={() => {}}
        onExport={() => {}}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה״כ לקוחות</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">לידים חדשים</p>
                <p className="text-2xl font-bold">{customers.filter(c => c.status === "lead").length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שביעות רצון ממוצעת</p>
                <p className="text-2xl font-bold">4.2</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VIP</p>
                <p className="text-2xl font-bold">{customers.filter(c => c.tags.includes("VIP")).length}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Tag className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>לקוח</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>שיחות</TableHead>
                <TableHead>קשר אחרון</TableHead>
                <TableHead>סה״כ רכישות</TableHead>
                <TableHead>תגיות</TableHead>
                <TableHead>דירוג</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {customer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge 
                      status={getStatusInfo(customer.status).type}
                      label={getStatusInfo(customer.status).label}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.conversations}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {customer.lastContact}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.totalSpent > 0 ? (
                      <span className="font-medium">₪{customer.totalSpent.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className={cn("text-xs", getTagColor(tag))}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.satisfaction ? (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < customer.satisfaction
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground"
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" />
                          צפה בפרופיל
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <MessageCircle className="w-4 h-4" />
                          שלח הודעה
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Tag className="w-4 h-4" />
                          הוסף תגית
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICustomers;
