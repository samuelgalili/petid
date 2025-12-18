import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
  onClick?: () => void;
}

export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  sizes = "100vw",
  priority = false,
  objectFit = "cover",
  onLoad,
  onClick,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

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
        rootMargin: "50px",
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // Generate WebP version URL
  const getWebPUrl = (url: string) => {
    // For external URLs (unsplash, etc.), try to add format parameter
    if (url.includes("unsplash.com")) {
      const urlObj = new URL(url);
      urlObj.searchParams.set("fm", "webp");
      urlObj.searchParams.set("q", "80");
      return urlObj.toString();
    }
    // For local images, replace extension with .webp
    return url.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  };

  // Generate srcset for responsive images
  const generateSrcSet = (url: string) => {
    if (!url.includes("unsplash.com")) return undefined;

    const urlObj = new URL(url);
    const widths = [320, 640, 768, 1024, 1280, 1536];
    
    return widths
      .map((w) => {
        const srcSetUrl = new URL(url);
        srcSetUrl.searchParams.set("w", w.toString());
        srcSetUrl.searchParams.set("fm", "webp");
        srcSetUrl.searchParams.set("q", "80");
        return `${srcSetUrl.toString()} ${w}w`;
      })
      .join(", ");
  };

  useEffect(() => {
    if (isInView) {
      setImageSrc(src);
    }
  }, [isInView, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const objectFitClass = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
    "scale-down": "object-scale-down",
  }[objectFit];

  return (
    <div 
      ref={imgRef} 
      className={cn("relative overflow-hidden", className)}
      onClick={onClick}
    >
      {/* Shimmer placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-amber-50 via-gray-100 to-amber-50/50"
          style={{
            backgroundSize: "200% 200%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-petid-gold/20 to-amber-200/30 flex items-center justify-center">
              <span className="text-2xl opacity-50">🐾</span>
            </div>
          </div>
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <picture>
          {/* WebP source with srcset */}
          <source
            type="image/webp"
            srcSet={generateSrcSet(src)}
            sizes={sizes}
          />
          
          {/* Fallback to original format */}
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={handleLoad}
            className={cn(
              "w-full h-full transition-opacity duration-300",
              objectFitClass,
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </picture>
      )}
    </div>
  );
};

// Add shimmer animation to global styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shimmer {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }
  `;
  document.head.appendChild(style);
}
