import { useState } from "react";
import { MapPin, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
}

// Common locations for quick selection
const POPULAR_LOCATIONS = [
  "תל אביב",
  "ירושלים", 
  "חיפה",
  "באר שבע",
  "נתניה",
  "הרצליה",
  "רמת גן",
  "פתח תקווה",
  "אשדוד",
  "ראשון לציון"
];

export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLocations = POPULAR_LOCATIONS.filter(loc =>
    loc.includes(searchTerm)
  );

  const handleSelect = (location: string) => {
    onChange(location);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="relative" dir="rtl">
      {value ? (
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm">{value}</span>
          <button onClick={handleClear} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <MapPin className="w-4 h-4" />
          הוסף מיקום
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Picker */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 p-4 min-w-[280px]"
            >
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חפש מיקום..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
              </div>

              {/* Custom location */}
              {searchTerm && !filteredLocations.includes(searchTerm) && (
                <button
                  onClick={() => handleSelect(searchTerm)}
                  className="w-full text-right px-3 py-2 rounded-lg hover:bg-muted text-sm flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  הוסף "{searchTerm}"
                </button>
              )}

              {/* Popular locations */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {filteredLocations.map((location) => (
                  <button
                    key={location}
                    onClick={() => handleSelect(location)}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-muted text-sm flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {location}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
