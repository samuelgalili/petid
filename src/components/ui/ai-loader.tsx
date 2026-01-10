import { cn } from "@/lib/utils";

interface AILoaderProps {
  text?: string;
  className?: string;
}

export const AILoader = ({ text = "Generating", className }: AILoaderProps) => {
  const letters = text.split("");

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Rotating orb */}
      <div className="ai-loader-orb" />
      
      {/* Animated text */}
      <div className="flex items-center justify-center gap-0.5">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="ai-loader-letter text-lg font-medium text-foreground"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AILoader;
