import { ReactNode, useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T | ((item: T, query: string) => boolean);
  filters?: FilterOption[];
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getItemId?: (item: T) => string;
  bulkActions?: ReactNode;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "חיפוש...",
  searchKey,
  filters = [],
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item: any) => item.id,
  bulkActions,
  emptyIcon,
  emptyMessage = "לא נמצאו תוצאות",
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data
  let filteredData = [...data];

  // Apply search
  if (searchQuery && searchKey) {
    filteredData = filteredData.filter((item) => {
      if (typeof searchKey === "function") {
        return searchKey(item, searchQuery);
      }
      const value = item[searchKey];
      return String(value).toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  // Apply filters
  Object.entries(activeFilters).forEach(([key, value]) => {
    if (value && value !== "all") {
      filteredData = filteredData.filter((item: any) => item[key] === value);
    }
  });

  // Apply sorting
  if (sortKey) {
    filteredData.sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const allIds = paginatedData.map(getItemId);
    const allSelected = allIds.every((id) => selectedItems.includes(id));
    if (allSelected) {
      onSelectionChange(selectedItems.filter((id) => !allIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedItems, ...allIds])]);
    }
  };

  const handleSelectItem = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {searchKey && (
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pr-10"
            />
          </div>
        )}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={activeFilters[filter.key] || "all"}
            onValueChange={(value) => {
              setActiveFilters((prev) => ({ ...prev, [filter.key]: value }));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectable && selectedItems.length > 0 && bulkActions && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItems.length} נבחרו
            </span>
            {bulkActions}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((item) =>
                          selectedItems.includes(getItemId(item))
                        )
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.sortable && "cursor-pointer select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-40"
                  >
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-40"
                  >
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      {emptyIcon}
                      <p className="mt-2">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={getItemId(item)}>
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(getItemId(item))}
                          onCheckedChange={() => handleSelectItem(getItemId(item))}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(item)
                          : (item as any)[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {filteredData.length} תוצאות | עמוד {currentPage} מתוך {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default DataTable;
