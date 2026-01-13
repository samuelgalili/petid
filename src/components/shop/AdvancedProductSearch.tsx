import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, X, Dog, Cat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductFilters {
  category?: string;
  petType?: 'dog' | 'cat' | 'other';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
}

interface AdvancedProductSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  categories: string[];
  activeFiltersCount: number;
  onClear: () => void;
}

/**
 * Advanced product search component with filters
 */
export const AdvancedProductSearch = ({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  categories,
  activeFiltersCount,
  onClear,
}: AdvancedProductSearchProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || 1000,
  ]);

  const handleFilterChange = useCallback((key: keyof ProductFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const handlePriceChange = useCallback((values: number[]) => {
    setPriceRange([values[0], values[1]]);
  }, []);

  const applyPriceFilter = useCallback(() => {
    onFiltersChange({
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    });
  }, [filters, priceRange, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    setPriceRange([0, 1000]);
    onClear();
    setIsFiltersOpen(false);
  }, [onClear]);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="חיפוש מוצרים..."
            className="pr-10"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-80" dir="rtl">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>סינון מוצרים</span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    נקה הכל
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Pet Type */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">סוג חיית מחמד</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'dog', label: 'כלבים', icon: Dog },
                    { value: 'cat', label: 'חתולים', icon: Cat },
                  ].map((pet) => (
                    <Button
                      key={pet.value}
                      variant={filters.petType === pet.value ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleFilterChange('petType', 
                        filters.petType === pet.value ? undefined : pet.value as any
                      )}
                    >
                      <pet.icon className="w-4 h-4" />
                      {pet.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">קטגוריה</Label>
                  <RadioGroup
                    value={filters.category || "all"}
                    onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="all" id="cat-all" />
                      <Label htmlFor="cat-all" className="font-normal">הכל</Label>
                    </div>
                    {categories.map((cat) => (
                      <div key={cat} className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value={cat} id={`cat-${cat}`} />
                        <Label htmlFor={`cat-${cat}`} className="font-normal">{cat}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Price Range */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">טווח מחירים</Label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={handlePriceChange}
                    onValueCommit={applyPriceFilter}
                    min={0}
                    max={1000}
                    step={10}
                    className="mt-2"
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>₪{priceRange[0]}</span>
                    <span>₪{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">סינון מהיר</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="in-stock"
                      checked={filters.inStock || false}
                      onCheckedChange={(checked) => handleFilterChange('inStock', checked || undefined)}
                    />
                    <Label htmlFor="in-stock" className="font-normal">במלאי בלבד</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="on-sale"
                      checked={filters.onSale || false}
                      onCheckedChange={(checked) => handleFilterChange('onSale', checked || undefined)}
                    />
                    <Label htmlFor="on-sale" className="font-normal">מבצעים בלבד</Label>
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">מיון</Label>
                <RadioGroup
                  value={filters.sortBy || "newest"}
                  onValueChange={(value) => handleFilterChange('sortBy', value as any)}
                >
                  {[
                    { value: 'newest', label: 'חדש ביותר' },
                    { value: 'price_asc', label: 'מחיר: מהנמוך לגבוה' },
                    { value: 'price_desc', label: 'מחיר: מהגבוה לנמוך' },
                    { value: 'name', label: 'לפי שם' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                      <Label htmlFor={`sort-${option.value}`} className="font-normal">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Apply Button */}
            <div className="absolute bottom-4 left-4 right-4">
              <Button 
                className="w-full" 
                onClick={() => setIsFiltersOpen(false)}
              >
                הצג תוצאות
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Tags */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.petType && (
              <Badge variant="secondary" className="gap-1">
                {filters.petType === 'dog' ? '🐕 כלבים' : '🐱 חתולים'}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('petType', undefined)}
                />
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="gap-1">
                {filters.category}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('category', undefined)}
                />
              </Badge>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <Badge variant="secondary" className="gap-1">
                ₪{filters.minPrice || 0} - ₪{filters.maxPrice || 1000}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => {
                    onFiltersChange({ ...filters, minPrice: undefined, maxPrice: undefined });
                    setPriceRange([0, 1000]);
                  }}
                />
              </Badge>
            )}
            {filters.inStock && (
              <Badge variant="secondary" className="gap-1">
                במלאי
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('inStock', undefined)}
                />
              </Badge>
            )}
            {filters.onSale && (
              <Badge variant="secondary" className="gap-1">
                מבצעים
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleFilterChange('onSale', undefined)}
                />
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedProductSearch;
