import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users2, 
  Plus, 
  Search, 
  Crown,
  ShoppingBag,
  Clock,
  Heart,
  Tag,
  Trash2,
  Edit
} from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  criteria: string[];
  color: string;
}

const mockSegments: Segment[] = [
  { 
    id: "1", 
    name: "לקוחות VIP", 
    description: "לקוחות עם רכישות מעל 1000₪", 
    customerCount: 234,
    criteria: ["סכום רכישות > 1000₪", "יותר מ-5 הזמנות"],
    color: "from-amber-500 to-yellow-600"
  },
  { 
    id: "2", 
    name: "לקוחות חדשים", 
    description: "נרשמו ב-30 הימים האחרונים", 
    customerCount: 89,
    criteria: ["נרשמו ב-30 יום אחרונים"],
    color: "from-emerald-500 to-green-600"
  },
  { 
    id: "3", 
    name: "לקוחות לא פעילים", 
    description: "לא רכשו ב-90 יום אחרונים", 
    customerCount: 156,
    criteria: ["הזמנה אחרונה > 90 יום"],
    color: "from-red-500 to-rose-600"
  },
  { 
    id: "4", 
    name: "בעלי כלבים", 
    description: "לקוחות עם חיית מחמד מסוג כלב", 
    customerCount: 567,
    criteria: ["סוג חיית מחמד = כלב"],
    color: "from-blue-500 to-cyan-600"
  },
  { 
    id: "5", 
    name: "בעלי חתולים", 
    description: "לקוחות עם חיית מחמד מסוג חתול", 
    customerCount: 423,
    criteria: ["סוג חיית מחמד = חתול"],
    color: "from-violet-500 to-purple-600"
  },
];

const AdminCustomerSegments = () => {
  const [segments, setSegments] = useState<Segment[]>(mockSegments);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalCustomers = segments.reduce((acc, s) => acc + s.customerCount, 0);

  const stats = [
    {
      title: "סה״כ סגמנטים",
      value: segments.length,
      icon: Tag,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "לקוחות מסווגים",
      value: totalCustomers.toLocaleString(),
      icon: Users2,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "לקוחות VIP",
      value: segments.find(s => s.name === "לקוחות VIP")?.customerCount || 0,
      icon: Crown,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "לא פעילים",
      value: segments.find(s => s.name === "לקוחות לא פעילים")?.customerCount || 0,
      icon: Clock,
      gradient: "from-red-500 to-rose-600",
    },
  ];

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="פילוח לקוחות" icon={Users2}>
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
                  placeholder="חיפוש סגמנט..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 ml-2" />
                    סגמנט חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white">יצירת סגמנט חדש</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-slate-300">שם הסגמנט</Label>
                      <Input className="bg-slate-800 border-slate-700 text-white" placeholder="לקוחות פרימיום..." />
                    </div>
                    <div>
                      <Label className="text-slate-300">תיאור</Label>
                      <Input className="bg-slate-800 border-slate-700 text-white" placeholder="תיאור קצר..." />
                    </div>
                    <div>
                      <Label className="text-slate-300 mb-3 block">קריטריונים</Label>
                      <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox id="orders" />
                          <Label htmlFor="orders" className="text-slate-300 text-sm">מספר הזמנות מינימלי</Label>
                          <Input type="number" className="w-20 bg-slate-800 border-slate-700 text-white" placeholder="5" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox id="amount" />
                          <Label htmlFor="amount" className="text-slate-300 text-sm">סכום רכישות מינימלי</Label>
                          <Input type="number" className="w-24 bg-slate-800 border-slate-700 text-white" placeholder="1000" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox id="pet" />
                          <Label htmlFor="pet" className="text-slate-300 text-sm">סוג חיית מחמד</Label>
                          <Select>
                            <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                              <SelectValue placeholder="בחר" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dog">כלב</SelectItem>
                              <SelectItem value="cat">חתול</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox id="inactive" />
                          <Label htmlFor="inactive" className="text-slate-300 text-sm">לא פעיל יותר מ-</Label>
                          <Input type="number" className="w-20 bg-slate-800 border-slate-700 text-white" placeholder="90" />
                          <span className="text-slate-400 text-sm">ימים</span>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
                      צור סגמנט
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Segments Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map((segment) => (
            <Card key={segment.id} className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800 group">
              <div className={`absolute inset-0 bg-gradient-to-br ${segment.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardContent className="p-5 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${segment.color} flex items-center justify-center`}>
                    <Users2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-slate-400 hover:text-white">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-white mb-1">{segment.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{segment.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-slate-400" />
                    <span className="text-2xl font-bold text-white">{segment.customerCount.toLocaleString()}</span>
                  </div>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                    צפה בלקוחות
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2">קריטריונים:</p>
                  <div className="flex flex-wrap gap-1">
                    {segment.criteria.map((criterion, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                        {criterion}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomerSegments;