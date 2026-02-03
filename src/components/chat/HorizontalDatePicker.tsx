import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { he } from "date-fns/locale";

interface HorizontalDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

const DAYS_TO_SHOW = 14;

const HorizontalDatePicker: React.FC<HorizontalDatePickerProps> = ({
  value,
  onChange,
  minDate = new Date(),
  className,
}) => {
  const [startDate, setStartDate] = React.useState(() => startOfDay(minDate));
  const selectedDate = value || startOfDay(new Date());

  const dates = React.useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const currentMonth = React.useMemo(() => {
    const middleDate = dates[Math.floor(dates.length / 2)];
    return format(middleDate, "MMMM", { locale: he });
  }, [dates]);

  const handlePrevious = () => {
    setStartDate(prev => addDays(prev, -7));
  };

  const handleNext = () => {
    setStartDate(prev => addDays(prev, 7));
  };

  const canGoPrevious = startOfDay(startDate) > startOfDay(minDate);

  return (
    <div className={cn("w-full py-4", className)}>
      {/* Month Header */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className={cn(
            "p-1 rounded-full transition-colors",
            canGoPrevious 
              ? "text-muted-foreground hover:text-foreground hover:bg-muted" 
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-medium text-foreground min-w-[100px] text-center">
          {currentMonth}
        </h3>
        <button
          onClick={handleNext}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Dates Row */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-2">
        {dates.slice(0, 7).map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayName = format(date, "EEE", { locale: he });
          const dayNumber = format(date, "d");

          return (
            <motion.button
              key={date.toISOString()}
              onClick={() => onChange(date)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-200",
                isSelected ? "z-10" : ""
              )}
            >
              {/* Date Circle */}
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300",
                  isSelected
                    ? "w-14 h-14 bg-gradient-to-br from-[#1E5799] via-[#7DB9E8] to-[#4ECDC4] text-white shadow-lg"
                    : "w-10 h-10 border-2 border-muted-foreground/30 text-foreground hover:border-primary/50"
                )}
              >
                <span className={cn(
                  "font-semibold",
                  isSelected ? "text-lg" : "text-sm"
                )}>
                  {dayNumber}
                </span>
              </div>
              
              {/* Day Name */}
              <span className={cn(
                "mt-1 text-xs transition-colors",
                isSelected ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {dayName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default HorizontalDatePicker;
