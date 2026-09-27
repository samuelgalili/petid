import { useEffect, useRef, useState } from "react";
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

const LOAD_TIMEOUT_MS = 12000;

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
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(priority ? src : "");
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setImageSrc(priority ? src : "");
    if (priority) setIsInView(true);
  }, [priority, src]);

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
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const generateSrcSet = (url: string) => {
    if (!url.includes("unsplash.com")) return undefined;

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
    if (isInView && src) setImageSrc(src);
  }, [isInView, src]);

  useEffect(() => {
    if (!isInView || !imageSrc || hasError || isLoaded) return;
    const timer = window.setTimeout(() => setHasError(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [hasError, imageSrc, isInView, isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
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
      className={cn("relative overflow-hidden bg-white", className)}
      onClick={onClick}
    >
      {hasError || !src ? (
        <div
          data-testid="product-image-fallback"
          role="img"
          aria-label={alt || "אין תמונה"}
          className="absolute inset-0 flex items-center justify-center bg-white"
        >
          <span className="text-xs text-neutral-400">אין תמונה</span>
        </div>
      ) : (
        <>
          {!isLoaded && <div className="absolute inset-0 bg-white" aria-hidden="true" />}
          {isInView && imageSrc && (
            <picture>
              <source
                type="image/webp"
                srcSet={generateSrcSet(src)}
                sizes={sizes}
              />
              <img
                src={imageSrc}
                alt={alt}
                width={width}
                height={height}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                className={cn(
                  "h-full w-full transition-opacity duration-300",
                  objectFitClass,
                  isLoaded ? "opacity-100" : "opacity-0",
                )}
              />
            </picture>
          )}
        </>
      )}
    </div>
  );
};
