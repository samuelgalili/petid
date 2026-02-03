import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { he } from "date-fns/locale";

interface HorizontalDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

const DAYS_TO_SHOW = 30;

const HorizontalDatePicker: React.FC<HorizontalDatePickerProps> = ({
  value,
  onChange,
  minDate = new Date(),
  className,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const selectedDate = value || startOfDay(new Date());

  const dates = React.useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startOfDay(minDate), i));
  }, [minDate]);

  const currentMonth = React.useMemo(() => {
    return format(selectedDate, "MMMM yyyy", { locale: he });
  }, [selectedDate]);

  return (
    <div className={cn("w-full py-4", className)}>
      {/* Month Header */}
      <div className="flex items-center justify-center mb-4">
        <h3 className="text-lg font-medium text-foreground">
          {currentMonth}
        </h3>
      </div>

      {/* Scrollable Dates Row */}
      <div 
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayName = format(date, "EEE", { locale: he });
          const dayNumber = format(date, "d");

          return (
            <motion.button
              key={date.toISOString()}
              onClick={() => onChange(date)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center transition-all duration-200",
                isSelected ? "z-10" : ""
              )}
            >
              {/* Date Circle */}
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300",
                  isSelected
                    ? "w-14 h-14 bg-gradient-to-br from-[#1E5799] via-[#7DB9E8] to-[#4ECDC4] text-white shadow-lg"
                    : "w-11 h-11 border-2 border-muted-foreground/30 text-foreground hover:border-primary/50"
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
                "mt-1.5 text-xs transition-colors",
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
