import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, 
  MapPin, 
  Users, 
  Package,
  DollarSign,
  Plus,
  Settings,
  BarChart3,
  Clock,
  Phone
} from "lucide-react";
import { motion } from "framer-motion";

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  manager: string;
  employees: number;
  inventory: number;
  revenue: number;
  isActive: boolean;
  workingHours: string;
}

const AdminBranches = () => {
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: '1',
      name: 'סניף תל אביב - מרכז',
      address: 'דיזנגוף 100',
      city: 'תל אביב',
      phone: '03-1234567',
      manager: 'יוסי כהן',
      employees: 8,
      inventory: 1250,
      revenue: 125000,
      isActive: true,
      workingHours: '09:00-21:00'
    },
    {
      id: '2',
      name: 'סניף חיפה',
      address: 'הנמל 45',
      city: 'חיפה',
      phone: '04-7654321',
      manager: 'שרה לוי',
      employees: 5,
      inventory: 850,
      revenue: 78000,
      isActive: true,
      workingHours: '09:00-20:00'
    },
    {
      id: '3',
      name: 'סניף ירושלים',
      address: 'יפו 200',
      city: 'ירושלים',
      phone: '02-9876543',
      manager: 'דני אברהם',
      employees: 6,
      inventory: 920,
      revenue: 92000,
      isActive: true,
      workingHours: '09:00-19:00'
    },
    {
      id: '4',
      name: 'סניף באר שבע',
      address: 'רגר 15',
      city: 'באר שבע',
      phone: '08-6543210',
      manager: 'רונית מזרחי',
      employees: 4,
      inventory: 450,
      revenue: 45000,
      isActive: false,
      workingHours: '09:00-18:00'
    }
  ]);

  const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0);
  const totalEmployees = branches.reduce((sum, b) => sum + b.employees, 0);
  const totalInventory = branches.reduce((sum, b) => sum + b.inventory, 0);
  const activeBranches = branches.filter(b => b.isActive).length;

  const toggleBranch = (id: string) => {
    setBranches(branches.map(b => 
      b.id === id ? { ...b, isActive: !b.isActive } : b
    ));
  };

  return (
    <AdminLayout title="ניהול סניפים">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניהול סניפים</h1>
            <p className="text-muted-foreground">צפייה וניהול כל הסניפים</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף סניף
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBranches}/{branches.length}</p>
                <p className="text-sm text-muted-foreground">סניפים פעילים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₪{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">הכנסות כוללות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmployees}</p>
                <p className="text-sm text-muted-foreground">עובדים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInventory.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">יחידות במלאי</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`overflow-hidden ${!branch.isActive && 'opacity-60'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{branch.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {branch.address}, {branch.city}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={branch.isActive}
                        onCheckedChange={() => toggleBranch(branch.id)}
                      />
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">מנהל: {branch.manager}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{branch.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{branch.workingHours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{branch.employees} עובדים</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold">₪{branch.revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">הכנסות</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold">{branch.inventory}</p>
                      <p className="text-xs text-muted-foreground">מלאי</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xl font-bold">{branch.employees}</p>
                      <p className="text-xs text-muted-foreground">עובדים</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <BarChart3 className="h-4 w-4" />
                      דוחות
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Package className="h-4 w-4" />
                      מלאי
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Users className="h-4 w-4" />
                      צוות
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Map Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              מפת סניפים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>מפת סניפים תוצג כאן</p>
                <p className="text-sm">נדרש חיבור ל-Google Maps API</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBranches;
