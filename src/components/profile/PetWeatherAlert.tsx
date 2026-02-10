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

const getWeatherTip = (temp: number, petType: 'dog' | 'cat', petName: string): { icon: React.ElementType; text: string; color: string; bgColor: string } => {
  if (temp >= 35) {
    return {
      icon: Thermometer,
      text: `חם מאוד היום (${temp}°C)! דאג/י ל${petName} מים קרים וצל`,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10 border-red-500/20',
    };
  }
  if (temp >= 30) {
    return {
      icon: Sun,
      text: `היום חם (${temp}°C). הקפד/י על מים נגישים ל${petName}`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    };
  }
  if (temp <= 5) {
    return {
      icon: Snowflake,
      text: `קר היום (${temp}°C). ${petType === 'dog' ? 'שקול/י מעיל לטיול' : `ודא/י ש${petName} חם בבית`}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    };
  }
  if (temp <= 15) {
    return {
      icon: Wind,
      text: `קריר היום (${temp}°C). ${petType === 'dog' ? 'טיול קצר מומלץ' : 'יום טוב להישאר בבית'}`,
      color: 'text-sky-600',
      bgColor: 'bg-sky-500/10 border-sky-500/20',
    };
  }
  return {
    icon: CloudSun,
    text: `מזג אוויר נעים היום (${temp}°C). יום מושלם ל${petType === 'dog' ? 'טיול' : 'משחק'}!`,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/20',
  };
};

export const PetWeatherAlert = ({ petType, petName }: PetWeatherAlertProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Try browser geolocation
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              // Use Open-Meteo (free, no API key needed)
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
              );
              const data = await res.json();
              if (data.current) {
                setWeather({
                  temperature: Math.round(data.current.temperature_2m),
                  description: '',
                });
              }
            },
            () => {
              // Default to Tel Aviv coordinates if geolocation denied
              fetchDefaultWeather();
            },
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
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            description: '',
          });
        }
      } catch {}
    };

    fetchWeather();
  }, []);

  if (!weather) return null;

  const tip = getWeatherTip(weather.temperature, petType, petName);
  const TipIcon = tip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`mx-4 mb-3 p-3 rounded-xl border ${tip.bgColor}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-full ${tip.bgColor} flex items-center justify-center flex-shrink-0`}>
          <TipIcon className={`w-4 h-4 ${tip.color}`} />
        </div>
        <span className={`text-xs ${tip.color} font-medium leading-relaxed`}>{tip.text}</span>
      </div>
    </motion.div>
  );
};
