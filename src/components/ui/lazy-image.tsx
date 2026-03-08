import { useState, useRef, useEffect, memo, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export const LazyImage = memo(({ 
  src, 
  alt, 
  className, 
  fallback = '/placeholder.svg',
  ...props 
}: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={error ? fallback : src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        'transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';
