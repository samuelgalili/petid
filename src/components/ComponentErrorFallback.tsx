import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComponentErrorFallbackProps {
  componentName: string;
  onRetry?: () => void;
}

export const ComponentErrorFallback = ({ 
  componentName, 
  onRetry 
}: ComponentErrorFallbackProps) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mx-4 my-4" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-900 font-jakarta mb-1">
            שגיאה בטעינת {componentName}
          </h4>
          <p className="text-xs text-gray-600 font-jakarta mb-3">
            לא הצלחנו לטעון את התוכן. אנא נסה שוב.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="text-xs font-jakarta font-bold"
            >
              נסה שוב
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
