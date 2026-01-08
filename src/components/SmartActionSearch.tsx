import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Shield, Trees, GraduationCap, Scissors, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
  keywords: string[];
}

const quickActions: QuickAction[] = [
  { 
    id: "insurance", 
    label: "ביטוח", 
    description: "ביטוח בריאות לחיית המחמד",
    icon: Shield, 
    path: "/insurance",
    keywords: ["ביטוח", "בריאות", "פוליסה", "כיסוי"]
  },
  { 
    id: "parks", 
    label: "גינות כלבים", 
    description: "מצא גינה קרובה אליך",
    icon: Trees, 
    path: "/parks",
    keywords: ["גינה", "גינות", "כלבים", "פארק", "טיול"]
  },
  { 
    id: "training", 
    label: "אילוף", 
    description: "טיפים ומדריכים לאילוף",
    icon: GraduationCap, 
    path: "/training",
    keywords: ["אילוף", "אימון", "פקודות", "התנהגות", "מאלף"]
  },
  { 
    id: "grooming", 
    label: "מספרה", 
    description: "קבע תור למספרה",
    icon: Scissors, 
    path: "/grooming",
    keywords: ["מספרה", "טיפוח", "רחצה", "תספורת", "ציפורניים"]
  },
];

interface SmartActionSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartActionSearch = ({ isOpen, onClose }: SmartActionSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredActions, setFilteredActions] = useState(quickActions);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActions(quickActions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = quickActions.filter(action => 
      action.label.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.keywords.some(kw => kw.toLowerCase().includes(query))
    );
    setFilteredActions(filtered);
  }, [searchQuery]);

  const handleActionClick = (path: string) => {
    onClose();
    setSearchQuery("");
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />

          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[9999] bg-white rounded-t-3xl max-h-[85vh] overflow-hidden"
            dir="rtl"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3" />

            {/* Search Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="מה תרצה לעשות?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12 pl-12 h-12 text-base rounded-2xl border-gray-200 bg-gray-50 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="overflow-y-auto max-h-[60vh] pb-safe">
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>לא נמצאו תוצאות</p>
                  <p className="text-sm mt-1">נסה לחפש משהו אחר</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleActionClick(action.path)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-right"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-cyan-500" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{action.label}</p>
                          <p className="text-sm text-gray-500 truncate">{action.description}</p>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
