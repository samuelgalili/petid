import { cn } from "@/lib/utils";

export default function KineticDotsLoader({ className }: { className?: string }) {
  const dots = 4;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-end gap-[6px] h-[50px] pt-[10px]">
        {[...Array(dots)].map((_, i) => (
          <div key={i} className="flex flex-col items-center w-[10px]">
            {/* Bouncing dot */}
            <div
              style={{
                animation: `gravity-bounce 0.7s ${i * 0.12}s infinite`,
              }}
            >
              <div
                className="relative w-[10px] h-[10px] rounded-full"
                style={{
                  background: 'hsl(var(--primary))',
                  animation: `rubber-morph 0.7s ${i * 0.12}s infinite`,
                }}
              >
                {/* Specular highlight */}
                <div
                  className="absolute w-[4px] h-[3px] rounded-full top-[2px] left-[2px]"
                  style={{ background: 'hsl(var(--primary-foreground) / 0.4)' }}
                />
              </div>
            </div>

            {/* Floor ripple */}
            <div
              className="w-[16px] h-[16px] rounded-full mt-[2px]"
              style={{
                border: '2px solid hsl(var(--primary) / 0.3)',
                animation: `ripple-expand 0.7s ${i * 0.12}s infinite`,
                opacity: 0,
              }}
            />

            {/* Shadow */}
            <div
              className="w-[10px] h-[3px] rounded-full -mt-[12px]"
              style={{
                background: 'hsl(var(--foreground) / 0.15)',
                animation: `shadow-breathe 0.7s ${i * 0.12}s infinite`,
              }}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes gravity-bounce {
          0% { transform: translateY(0); animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }
          50% { transform: translateY(-28px); animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0); }
          100% { transform: translateY(0); }
        }
        @keyframes rubber-morph {
          0% { transform: scale(1.3, 0.65); }
          5% { transform: scale(0.9, 1.1); }
          15% { transform: scale(1, 1); }
          50% { transform: scale(1, 1); }
          85% { transform: scale(0.9, 1.1); }
          100% { transform: scale(1.3, 0.65); }
        }
        @keyframes shadow-breathe {
          0% { transform: scale(1.3); opacity: 0.5; }
          50% { transform: scale(0.5); opacity: 0.1; }
          100% { transform: scale(1.3); opacity: 0.5; }
        }
        @keyframes ripple-expand {
          0% { transform: scale(0.5); opacity: 0; border-width: 3px; }
          5% { opacity: 0.7; }
          30% { transform: scale(1.4); opacity: 0; border-width: 0px; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
