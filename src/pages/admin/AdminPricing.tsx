import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Percent, 
  Tag, 
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Users,
  Package
} from "lucide-react";
import { motion } from "framer-motion";

interface PriceRule {
  id: string;
  name: string;
  type: 'customer_group' | 'quantity' | 'time_based' | 'bundle';
  discount: number;
  discountType: 'percentage' | 'fixed';
  conditions: string;
  isActive: boolean;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isDefault: boolean;
}

const AdminPricing = () => {
  const [priceRules, setPriceRules] = useState<PriceRule[]>([
    {
      id: '1',
      name: 'הנחת VIP',
      type: 'customer_group',
      discount: 15,
      discountType: 'percentage',
      conditions: 'לקוחות VIP בלבד',
      isActive: true
    },
    {
      id: '2',
      name: 'הנחת כמות 10+',
      type: 'quantity',
      discount: 10,
      discountType: 'percentage',
      conditions: 'רכישה של 10 יחידות ומעלה',
      isActive: true
    },
    {
      id: '3',
      name: 'מבצע סוף שבוע',
      type: 'time_based',
      discount: 20,
      discountType: 'percentage',
      conditions: 'שישי-שבת',
      isActive: false
    },
    {
      id: '4',
      name: 'חבילת התחלה',
      type: 'bundle',
      discount: 50,
      discountType: 'fixed',
      conditions: 'מזון + קערה + צעצוע',
      isActive: true
    }
  ]);

  const [currencies, setCurrencies] = useState<Currency[]>([
    { code: 'ILS', name: 'שקל ישראלי', symbol: '₪', rate: 1, isDefault: true },
    { code: 'USD', name: 'דולר אמריקאי', symbol: '$', rate: 0.27, isDefault: false },
    { code: 'EUR', name: 'יורו', symbol: '€', rate: 0.25, isDefault: false }
  ]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      customer_group: 'קבוצת לקוחות',
      quantity: 'כמות',
      time_based: 'זמן',
      bundle: 'חבילה'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_group':
        return <Users className="h-4 w-4" />;
      case 'quantity':
        return <Package className="h-4 w-4" />;
      case 'bundle':
        return <Tag className="h-4 w-4" />;
      default:
        return <Percent className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout title="תמחור ומט״ח">
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">תמחור ומט"ח</h1>
            <p className="text-muted-foreground">ניהול מחירים, הנחות ומטבעות</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₪</p>
                <p className="text-sm text-muted-foreground">מטבע ברירת מחדל</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Percent className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{priceRules.filter(r => r.isActive).length}</p>
                <p className="text-sm text-muted-foreground">כללי תמחור פעילים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Tag className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currencies.length}</p>
                <p className="text-sm text-muted-foreground">מטבעות נתמכים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">+8%</p>
                <p className="text-sm text-muted-foreground">מרג'ין ממוצע</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules" className="gap-2">
              <Percent className="h-4 w-4" />
              כללי תמחור
            </TabsTrigger>
            <TabsTrigger value="currencies" className="gap-2">
              <DollarSign className="h-4 w-4" />
              מטבעות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    כללי תמחור והנחות
                  </CardTitle>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף כלל
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priceRules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 rounded-lg border ${!rule.isActive && 'opacity-60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getTypeIcon(rule.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{rule.name}</p>
                              <Badge variant="secondary">{getTypeLabel(rule.type)}</Badge>
                              {!rule.isActive && <Badge variant="outline">לא פעיל</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{rule.conditions}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <p className="text-2xl font-bold text-green-600">
                              {rule.discountType === 'percentage' ? `${rule.discount}%` : `₪${rule.discount}`}
                            </p>
                            <p className="text-xs text-muted-foreground">הנחה</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currencies" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    ניהול מטבעות
                  </CardTitle>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף מטבע
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currencies.map((currency) => (
                    <motion.div
                      key={currency.code}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border ${currency.isDefault && 'border-primary bg-primary/5'}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                            {currency.symbol}
                          </div>
                          <div>
                            <p className="font-medium">{currency.code}</p>
                            <p className="text-sm text-muted-foreground">{currency.name}</p>
                          </div>
                        </div>
                        {currency.isDefault && <Badge>ברירת מחדל</Badge>}
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">שער המרה</p>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              value={currency.rate} 
                              className="w-24"
                              disabled={currency.isDefault}
                            />
                            <span className="text-sm text-muted-foreground">ל-1 ₪</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">עדכון שערים אוטומטי</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    שערי המטבעות מתעדכנים אוטומטית פעם ביום מבנק ישראל
                  </p>
                  <Button variant="outline">עדכן שערים עכשיו</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;
