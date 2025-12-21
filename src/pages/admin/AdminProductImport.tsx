import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  status: "valid" | "error" | "warning";
}

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

const EXPECTED_COLUMNS = [
  { key: "name", label: "שם מוצר", required: true },
  { key: "description", label: "תיאור", required: false },
  { key: "category", label: "קטגוריה", required: false },
  { key: "price", label: "מחיר", required: true },
  { key: "original_price", label: "מחיר לפני הנחה", required: false },
  { key: "image_url", label: "קישור תמונה", required: true },
  { key: "in_stock", label: "במלאי", required: false },
  { key: "pet_type", label: "סוג חיה", required: false },
];

const AdminProductImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast({
        title: "שגיאה",
        description: "יש להעלות קובץ CSV או Excel (XLSX/XLS)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    if (isExcel) {
      parseExcel(selectedFile);
    } else {
      parseCSV(selectedFile);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            title: "שגיאה",
            description: "הקובץ ריק או לא תקין",
            variant: "destructive",
          });
          return;
        }

        const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
        const rows = jsonData.slice(1).map((row) => 
          (row as string[]).map((cell) => String(cell || "").trim())
        );

        setCsvHeaders(headers);
        setCsvData(rows);

        // Auto-map columns
        const autoMappings: ColumnMapping[] = headers.map((header) => {
          const matchedColumn = EXPECTED_COLUMNS.find(
            (col) =>
              col.key.toLowerCase() === header.toLowerCase() ||
              col.label.includes(header) ||
              header.includes(col.key)
          );
          return {
            csvColumn: header,
            dbColumn: matchedColumn?.key || "",
          };
        });
        setColumnMappings(autoMappings);
        setStep("mapping");
      } catch (error) {
        console.error("Excel parse error:", error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לקרוא את קובץ האקסל",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "שגיאה",
          description: "הקובץ ריק או לא תקין",
          variant: "destructive",
        });
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map((line) => parseCSVLine(line));

      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map columns
      const autoMappings: ColumnMapping[] = headers.map((header) => {
        const matchedColumn = EXPECTED_COLUMNS.find(
          (col) =>
            col.key.toLowerCase() === header.toLowerCase() ||
            col.label.includes(header) ||
            header.includes(col.key)
        );
        return {
          csvColumn: header,
          dbColumn: matchedColumn?.key || "",
        };
      });
      setColumnMappings(autoMappings);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const updateMapping = (csvColumn: string, dbColumn: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.csvColumn === csvColumn ? { ...m, dbColumn } : m))
    );
  };

  const validateAndPreview = () => {
    const rows: ParsedRow[] = csvData.map((row, index) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];

      columnMappings.forEach((mapping, colIndex) => {
        if (mapping.dbColumn) {
          data[mapping.dbColumn] = row[colIndex] || "";
        }
      });

      // Validate required fields
      EXPECTED_COLUMNS.filter((col) => col.required).forEach((col) => {
        if (!data[col.key]?.trim()) {
          errors.push(`${col.label} חובה`);
        }
      });

      // Validate price
      if (data.price && isNaN(parseFloat(data.price))) {
        errors.push("מחיר לא תקין");
      }

      return {
        rowNumber: index + 2,
        data,
        errors,
        status: errors.length > 0 ? "error" : "valid",
      };
    });

    setParsedRows(rows);
    setStep("preview");
  };

  const startImport = async () => {
    setStep("importing");
    setImportProgress(0);

    const validRows = parsedRows.filter((r) => r.status === "valid");
    let success = 0;
    let failed = 0;

    // Get a business_id (we'll use the first one or create one if needed)
    const { data: businesses } = await supabase
      .from("business_profiles")
      .select("id")
      .limit(1);
    
    const businessId = businesses?.[0]?.id;
    
    if (!businessId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא פרופיל עסקי. יש ליצור עסק קודם.",
        variant: "destructive",
      });
      setStep("preview");
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const { error } = await supabase.from("business_products").insert({
          business_id: businessId,
          name: row.data.name,
          description: row.data.description || null,
          category: row.data.category || null,
          price: parseFloat(row.data.price),
          original_price: row.data.original_price ? parseFloat(row.data.original_price) : null,
          image_url: row.data.image_url,
          in_stock: row.data.in_stock?.toLowerCase() !== "false",
          pet_type: (row.data.pet_type as "dog" | "cat") || null,
        });

        if (error) throw error;
        success++;
      } catch (error) {
        console.error("Import error:", error);
        failed++;
      }

      setImportProgress(((i + 1) / validRows.length) * 100);
    }

    setImportResults({ success, failed });
    setStep("done");

    await logAction({
      action_type: "product.created",
      entity_type: "product",
      metadata: {
        import_type: "csv",
        total_rows: validRows.length,
        success_count: success,
        failed_count: failed,
      },
    });

    toast({
      title: "הייבוא הסתיים",
      description: `${success} מוצרים יובאו בהצלחה, ${failed} נכשלו`,
    });
  };

  const downloadTemplate = () => {
    const headers = EXPECTED_COLUMNS.map((col) => col.key).join(",");
    const exampleRow = "מזון לכלבים,מזון איכותי לכלבים,מזון,49.90,59.90,https://example.com/image.jpg,true,dog";
    const csv = `${headers}\n${exampleRow}`;
    
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter((r) => r.status === "valid").length;
  const errorCount = parsedRows.filter((r) => r.status === "error").length;

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/admin/products")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-bold">ייבוא מוצרים</h1>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 ml-2" />
            תבנית
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {["העלאה", "מיפוי", "תצוגה מקדימה", "ייבוא"].map((label, i) => {
            const stepIndex = ["upload", "mapping", "preview", "importing"].indexOf(step);
            const isActive = i <= stepIndex;
            const isCurrent = i === stepIndex;

            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs ${isCurrent ? "font-bold" : ""}`}>{label}</span>
                {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className="p-8 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">גרור קובץ CSV או Excel לכאן או לחץ להעלאה</p>
                <p className="text-sm text-muted-foreground">תומך בקבצי CSV, XLSX ו-XLS</p>
              </div>
            </Card>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </motion.div>
        )}

        {/* Step: Mapping */}
        {step === "mapping" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span className="font-medium">{file?.name}</span>
                <Badge variant="secondary">{csvData.length} שורות</Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                התאם את עמודות הקובץ לשדות במערכת:
              </p>

              <div className="space-y-3">
                {columnMappings.map((mapping) => (
                  <div key={mapping.csvColumn} className="flex items-center gap-3">
                    <div className="flex-1 p-2 bg-muted rounded text-sm">{mapping.csvColumn}</div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Select
                      value={mapping.dbColumn || "_none"}
                      onValueChange={(value) => updateMapping(mapping.csvColumn, value === "_none" ? "" : value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="בחר שדה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">לא למפות</SelectItem>
                        {EXPECTED_COLUMNS.map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label} {col.required && "*"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">
                חזרה
              </Button>
              <Button onClick={validateAndPreview} className="flex-1">
                המשך לתצוגה מקדימה
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500">
                <Check className="w-3 h-3 ml-1" />
                {validCount} תקינות
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <X className="w-3 h-3 ml-1" />
                  {errorCount} שגיאות
                </Badge>
              )}
            </div>

            <Card className="overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>שם מוצר</TableHead>
                      <TableHead>מחיר</TableHead>
                      <TableHead>שגיאות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.status === "valid" ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{row.data.name || "-"}</TableCell>
                        <TableCell>₪{row.data.price || "-"}</TableCell>
                        <TableCell className="text-destructive text-xs">
                          {row.errors.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")} className="flex-1">
                חזרה
              </Button>
              <Button onClick={startImport} disabled={validCount === 0} className="flex-1">
                ייבא {validCount} מוצרים
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8 text-center">
              <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
              <p className="font-medium mb-4">מייבא מוצרים...</p>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">{Math.round(importProgress)}%</p>
            </Card>
          </motion.div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8 text-center">
              <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">הייבוא הושלם!</h2>
              <div className="flex justify-center gap-4 mb-6">
                <Badge variant="default" className="bg-green-500 text-lg px-4 py-2">
                  {importResults.success} הצליחו
                </Badge>
                {importResults.failed > 0 && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    {importResults.failed} נכשלו
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate("/admin/products")}>
                  חזרה למוצרים
                </Button>
                <Button
                  onClick={() => {
                    setStep("upload");
                    setFile(null);
                    setCsvHeaders([]);
                    setCsvData([]);
                    setParsedRows([]);
                  }}
                >
                  ייבוא נוסף
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminProductImport;
