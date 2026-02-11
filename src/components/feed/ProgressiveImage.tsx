import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export const ProgressiveImage = ({ src, alt, className, onClick, onDoubleClick }: ProgressiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  // Generate a tiny blurred placeholder URL (low quality)
  const placeholderSrc = src?.includes('unsplash.com') 
    ? src.replace(/w=\d+/, 'w=20').replace(/h=\d+/, 'h=20') + '&blur=50&q=10'
    : undefined;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} onClick={onClick} onDoubleClick={onDoubleClick}>
      {/* Blurred placeholder */}
      {placeholderSrc && !loaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg"
          aria-hidden
        />
      )}

      {/* Shimmer while loading */}
      {!loaded && !placeholderSrc && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Full image */}
      <img
        src={error ? '/placeholder.svg' : src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};
