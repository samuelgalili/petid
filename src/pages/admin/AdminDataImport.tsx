import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertTriangle, FileText, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const dataTypeOptions = [
  { value: 'orders', label: 'הזמנות', icon: FileSpreadsheet, description: 'ייבוא הזמנות ועסקאות' },
  { value: 'products', label: 'מוצרים', icon: FileText, description: 'ייבוא קטלוג מוצרים' },
  { value: 'customers', label: 'לקוחות', icon: FileText, description: 'ייבוא רשימת לקוחות' },
  { value: 'expenses', label: 'הוצאות', icon: FileText, description: 'ייבוא הוצאות עסקיות' },
];

const sampleMappings: Record<string, Record<string, string>> = {
  orders: {
    order_id: 'מזהה הזמנה',
    date: 'תאריך',
    total: 'סכום כולל',
    subtotal: 'סכום ביניים',
    tax: 'מע"מ',
    shipping: 'משלוח',
    discount: 'הנחה',
    customer_email: 'אימייל לקוח',
    customer_name: 'שם לקוח',
    status: 'סטטוס',
  },
  products: {
    sku: 'מק"ט',
    name: 'שם מוצר',
    price: 'מחיר',
    cost: 'עלות',
    stock: 'מלאי',
    category: 'קטגוריה',
    description: 'תיאור',
  },
  customers: {
    email: 'אימייל',
    first_name: 'שם פרטי',
    last_name: 'שם משפחה',
    phone: 'טלפון',
    city: 'עיר',
    address: 'כתובת',
  },
  expenses: {
    date: 'תאריך',
    amount: 'סכום',
    category: 'קטגוריה',
    vendor: 'ספק',
    description: 'תיאור',
  },
};

const AdminDataImport = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataType, setDataType] = useState<string>('orders');
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const parseCSV = (text: string): { headers: string[]; data: any[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return { headers, data };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, data } = parseCSV(text);
      setHeaders(headers);
      setCsvData(data);

      // Auto-map headers if they match
      const autoMapping: Record<string, string> = {};
      const expectedFields = Object.keys(sampleMappings[dataType] || {});
      
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        const matchedField = expectedFields.find(field => 
          lowerHeader.includes(field.toLowerCase()) || 
          field.toLowerCase().includes(lowerHeader)
        );
        if (matchedField) {
          autoMapping[matchedField] = header;
        }
      });
      
      setMapping(autoMapping);

      toast({
        title: "קובץ נטען",
        description: `נמצאו ${data.length} שורות`,
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      toast({
        title: "שגיאה",
        description: "אין נתונים לייבוא",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Map CSV data to expected format
      const mappedData = csvData.map(row => {
        const mappedRow: Record<string, any> = {};
        Object.entries(mapping).forEach(([targetField, sourceHeader]) => {
          mappedRow[targetField] = row[sourceHeader];
        });
        // Also include original data for unmapped fields
        Object.entries(row).forEach(([key, value]) => {
          if (!Object.values(mapping).includes(key)) {
            mappedRow[key] = value;
          }
        });
        return mappedRow;
      });

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: {
          data: mappedData,
          dataType,
          sourceType: 'csv',
          sourceName: fileName,
          mapping,
        },
      });

      if (error) throw error;

      setResult(data);

      toast({
        title: data.success > 0 ? "ייבוא הושלם" : "ייבוא נכשל",
        description: `${data.success} רשומות יובאו בהצלחה, ${data.failed} נכשלו`,
        variant: data.failed > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בייבוא הנתונים",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateMetrics = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-metrics', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "חישוב הושלם",
        description: `${data.daysProcessed} ימים עודכנו`,
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const fields = Object.keys(sampleMappings[dataType] || {});
    const csv = fields.join(',') + '\n' + fields.map(() => '').join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${dataType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="ייבוא נתונים" icon={Upload}>
      <div className="space-y-6">
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="import">ייבוא CSV</TabsTrigger>
            <TabsTrigger value="calculate">חישוב מטריקות</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Data Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">בחר סוג נתונים</CardTitle>
                <CardDescription>בחר את סוג הנתונים שברצונך לייבא</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {dataTypeOptions.map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        dataType === option.value ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setDataType(option.value);
                        setMapping({});
                        setCsvData([]);
                        setHeaders([]);
                        setResult(null);
                      }}
                    >
                      <CardContent className="p-4 text-center">
                        <option.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">העלאת קובץ CSV</CardTitle>
                    <CardDescription>העלה קובץ CSV עם הנתונים שלך</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 ml-2" />
                    הורד תבנית
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {fileName ? (
                    <>
                      <p className="font-medium text-primary">{fileName}</p>
                      <p className="text-sm text-muted-foreground">{csvData.length} שורות נמצאו</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">לחץ להעלאת קובץ</p>
                      <p className="text-sm text-muted-foreground">או גרור לכאן קובץ CSV</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping */}
            {headers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">מיפוי שדות</CardTitle>
                  <CardDescription>התאם את עמודות הקובץ לשדות במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(sampleMappings[dataType] || {}).map(([field, label]) => (
                      <div key={field} className="space-y-2">
                        <Label>{label}</Label>
                        <Select
                          value={mapping[field] || ''}
                          onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר עמודה" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">לא ממופה</SelectItem>
                            {headers.map((header) => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {csvData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
                  <CardDescription>5 השורות הראשונות</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {headers.slice(0, 6).map((header) => (
                              <th key={header} className="p-2 text-right font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b">
                              {headers.slice(0, 6).map((header) => (
                                <td key={header} className="p-2 truncate max-w-[150px]">{row[header]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Import Button */}
            {csvData.length > 0 && (
              <div className="flex gap-4">
                <Button onClick={handleImport} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מייבא...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      ייבא {csvData.length} רשומות
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Results */}
            {result && (
              <Card className={result.failed > 0 ? 'border-destructive' : 'border-success'}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {result.failed === 0 ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    )}
                    תוצאות ייבוא
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <Badge variant="default" className="bg-success">
                      <CheckCircle className="w-3 h-3 ml-1" />
                      {result.success} הצליחו
                    </Badge>
                    {result.failed > 0 && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 ml-1" />
                        {result.failed} נכשלו
                      </Badge>
                    )}
                  </div>
                  
                  {result.errors.length > 0 && (
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1">
                        {result.errors.map((error, i) => (
                          <p key={i} className="text-sm text-destructive">{error}</p>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calculate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">חישוב מטריקות יומיות</CardTitle>
                <CardDescription>
                  חשב ועדכן את המטריקות היומיות על בסיס הנתונים המיובאים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  פעולה זו תחשב את כל המטריקות (הכנסות, הזמנות, לקוחות, מוצרים מובילים) 
                  ותעדכן את טבלת metrics_daily. מומלץ להריץ לאחר כל ייבוא נתונים.
                </p>
                <Button onClick={handleCalculateMetrics} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מחשב...
                    </>
                  ) : (
                    "חשב מטריקות"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminDataImport;
