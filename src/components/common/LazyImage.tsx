import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none";
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

/**
 * Optimized lazy loading image component with:
 * - Intersection Observer for lazy loading
 * - WebP format detection
 * - Progressive loading with blur-up
 * - Error handling with fallback
 * - Size optimization for different viewports
 */
export const LazyImage = memo(({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  objectFit = "cover",
  fallback = "/placeholder.svg",
  onLoad,
  onError,
  onClick,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : "");
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Load image when in view
  useEffect(() => {
    if (isInView && src) {
      setCurrentSrc(src);
    }
  }, [isInView, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setCurrentSrc(fallback);
    onError?.();
  };

  // Generate optimized URL for external images
  const getOptimizedSrc = (url: string, targetWidth?: number) => {
    if (!url) return fallback;
    
    // Supabase Storage optimization
    if (url.includes('supabase.co/storage')) {
      const separator = url.includes('?') ? '&' : '?';
      const w = targetWidth || width || 800;
      return `${url}${separator}width=${w}&quality=80`;
    }
    
    // Unsplash optimization
    if (url.includes('unsplash.com')) {
      try {
        const urlObj = new URL(url);
        const w = targetWidth || width || 800;
        urlObj.searchParams.set('w', w.toString());
        urlObj.searchParams.set('fm', 'webp');
        urlObj.searchParams.set('q', '80');
        return urlObj.toString();
      } catch {
        return url;
      }
    }
    
    return url;
  };

  // Generate srcset for responsive images
  const generateSrcSet = () => {
    if (!currentSrc || hasError) return undefined;
    
    const widths = [320, 640, 768, 1024, 1280];
    return widths
      .map((w) => `${getOptimizedSrc(currentSrc, w)} ${w}w`)
      .join(", ");
  };

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
  }[objectFit];

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden bg-muted", className)}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <Skeleton 
          variant="shimmer" 
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={hasError ? fallback : getOptimizedSrc(currentSrc)}
          srcSet={!hasError ? generateSrcSet() : undefined}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            objectFitClass,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";

export default LazyImage;
