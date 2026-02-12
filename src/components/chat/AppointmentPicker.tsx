import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import HorizontalDatePicker from "./HorizontalDatePicker";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface AppointmentPickerProps {
  onConfirm: (date: Date, time: string) => void;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00",
];

export const AppointmentPicker = ({ onConfirm }: AppointmentPickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm(selectedDate, selectedTime);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg mt-2"
      style={{ maxWidth: "340px" }}
    >
      {/* Date Selection */}
      <HorizontalDatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        minDate={new Date()}
      />

      {/* Time Selection */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">בחר שעה</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto scrollbar-hide">
          {TIME_SLOTS.map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs font-medium transition-all",
                selectedTime === time
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-foreground hover:bg-muted"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          disabled={!selectedTime}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
            selectedTime
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Check className="w-4 h-4" />
          {selectedTime
            ? `אישור: ${format(selectedDate, "EEEE d/M", { locale: he })} בשעה ${selectedTime}`
            : "בחר תאריך ושעה"}
        </motion.button>
      </div>
    </motion.div>
  );
};
