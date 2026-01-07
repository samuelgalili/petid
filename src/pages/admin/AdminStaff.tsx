import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  Shield,
  Clock,
  Phone,
  Mail,
  Edit,
  Trash2,
  Calendar
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "sales" | "support" | "warehouse";
  status: "active" | "inactive" | "vacation";
  avatar?: string;
  joinedAt: string;
}

const mockStaff: StaffMember[] = [
  { id: "1", name: "יוסי כהן", email: "yossi@petid.co.il", phone: "050-1234567", role: "admin", status: "active", joinedAt: "2023-01-15" },
  { id: "2", name: "מיכל לוי", email: "michal@petid.co.il", phone: "052-9876543", role: "manager", status: "active", joinedAt: "2023-03-20" },
  { id: "3", name: "דני אברהם", email: "dani@petid.co.il", phone: "054-5551234", role: "sales", status: "active", joinedAt: "2023-06-10" },
  { id: "4", name: "רונית שרון", email: "ronit@petid.co.il", phone: "050-4443333", role: "support", status: "vacation", joinedAt: "2023-08-05" },
  { id: "5", name: "עמית גולן", email: "amit@petid.co.il", phone: "053-7778888", role: "warehouse", status: "active", joinedAt: "2023-10-01" },
];

const AdminStaff = () => {
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const stats = [
    {
      title: "סה״כ עובדים",
      value: staff.length,
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "פעילים",
      value: staff.filter(s => s.status === "active").length,
      icon: Shield,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "בחופשה",
      value: staff.filter(s => s.status === "vacation").length,
      icon: Calendar,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "לא פעילים",
      value: staff.filter(s => s.status === "inactive").length,
      icon: Clock,
      gradient: "from-slate-500 to-slate-600",
    },
  ];

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      sales: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      support: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      warehouse: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    };
    const labels: Record<string, string> = {
      admin: "מנהל מערכת",
      manager: "מנהל",
      sales: "מכירות",
      support: "תמיכה",
      warehouse: "מחסן",
    };
    return <Badge className={styles[role]}>{labels[role]}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      vacation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    const labels: Record<string, string> = {
      active: "פעיל",
      inactive: "לא פעיל",
      vacation: "בחופשה",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterRole === "all") return matchesSearch;
    return matchesSearch && s.role === filterRole;
  });

  return (
    <AdminLayout title="ניהול צוות" icon={Users}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש עובד..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="manager">מנהל</SelectItem>
                  <SelectItem value="sales">מכירות</SelectItem>
                  <SelectItem value="support">תמיכה</SelectItem>
                  <SelectItem value="warehouse">מחסן</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 ml-2" />
                    עובד חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">הוספת עובד חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-slate-300">שם מלא</Label>
                      <Input className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div>
                      <Label className="text-slate-300">אימייל</Label>
                      <Input type="email" className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div>
                      <Label className="text-slate-300">טלפון</Label>
                      <Input className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div>
                      <Label className="text-slate-300">תפקיד</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="בחר תפקיד" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">מנהל מערכת</SelectItem>
                          <SelectItem value="manager">מנהל</SelectItem>
                          <SelectItem value="sales">מכירות</SelectItem>
                          <SelectItem value="support">תמיכה</SelectItem>
                          <SelectItem value="warehouse">מחסן</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
                      הוסף עובד
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Staff Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-white">{member.name}</h3>
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                  {getStatusBadge(member.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>הצטרף ב-{member.joinedAt}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="flex-1 border-slate-700 text-slate-300">
                    <Edit className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;