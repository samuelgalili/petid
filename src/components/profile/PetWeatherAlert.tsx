/**
 * PetWeatherAlert — Minimalist inline weather indicator
 * Shows a small weather icon + temperature badge, designed to sit next to pet name
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CloudSun, Droplets, Thermometer, Wind, Snowflake, Sun } from "lucide-react";

interface PetWeatherAlertProps {
  petType: 'dog' | 'cat';
  petName: string;
}

interface WeatherData {
  temperature: number;
  description: string;
}

const getWeatherInfo = (temp: number): { icon: React.ElementType; color: string } => {
  if (temp >= 35) return { icon: Thermometer, color: "text-destructive" };
  if (temp >= 28) return { icon: Sun, color: "text-[hsl(25,90%,50%)]" };
  if (temp >= 18) return { icon: CloudSun, color: "text-primary" };
  if (temp >= 8) return { icon: Wind, color: "text-muted-foreground" };
  return { icon: Snowflake, color: "text-[hsl(200,70%,55%)]" };
};

export const PetWeatherAlert = ({ petType, petName }: PetWeatherAlertProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
              );
              const data = await res.json();
              if (data.current) {
                setWeather({ temperature: Math.round(data.current.temperature_2m), description: '' });
              }
            },
            () => fetchDefaultWeather(),
            { timeout: 5000 }
          );
        } else {
          fetchDefaultWeather();
        }
      } catch {
        fetchDefaultWeather();
      }
    };

    const fetchDefaultWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.78&current=temperature_2m&timezone=auto'
        );
        const data = await res.json();
        if (data.current) {
          setWeather({ temperature: Math.round(data.current.temperature_2m), description: '' });
        }
      } catch { /* silent */ }
    };

    fetchWeather();
  }, []);

  if (!weather) return null;

  const { icon: WeatherIcon, color } = getWeatherInfo(weather.temperature);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 backdrop-blur-sm border border-border/30"
    >
      <WeatherIcon className={`w-3 h-3 ${color}`} strokeWidth={2} />
      <span className="text-[10px] font-semibold text-foreground tabular-nums">{weather.temperature}°</span>
    </motion.div>
  );
};
