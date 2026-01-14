import { useState, useCallback } from 'react';

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

interface OptimizedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'webp',
};

/**
 * Image optimization hook with WebP support and compression
 */
export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const supportsWebP = useCallback((): boolean => {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, []);

  const optimizeImage = useCallback(async (
    file: File,
    options: OptimizationOptions = {}
  ): Promise<OptimizedImage> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    setIsOptimizing(true);
    setProgress(0);

    try {
      // Load image
      const img = await loadImage(file);
      setProgress(30);

      // Calculate new dimensions
      let { width, height } = img;
      const maxWidth = opts.maxWidth!;
      const maxHeight = opts.maxHeight!;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      setProgress(50);

      // Create canvas and draw
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      setProgress(70);

      // Convert to blob
      const format = supportsWebP() && opts.format === 'webp' 
        ? 'image/webp' 
        : `image/${opts.format === 'jpeg' ? 'jpeg' : 'png'}`;
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
          format,
          opts.quality
        );
      });
      setProgress(90);

      const url = URL.createObjectURL(blob);
      setProgress(100);

      return {
        blob,
        url,
        width,
        height,
        originalSize: file.size,
        optimizedSize: blob.size,
        compressionRatio: Math.round((1 - blob.size / file.size) * 100),
      };
    } finally {
      setIsOptimizing(false);
    }
  }, [supportsWebP]);

  const optimizeMultiple = useCallback(async (
    files: File[],
    options: OptimizationOptions = {}
  ): Promise<OptimizedImage[]> => {
    setIsOptimizing(true);
    const results: OptimizedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await optimizeImage(files[i], options);
      results.push(result);
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsOptimizing(false);
    return results;
  }, [optimizeImage]);

  const generateThumbnail = useCallback(async (
    file: File,
    size: number = 150
  ): Promise<string> => {
    const result = await optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'webp',
    });
    return result.url;
  }, [optimizeImage]);

  const generateResponsiveSet = useCallback(async (
    file: File
  ): Promise<{ small: string; medium: string; large: string }> => {
    const [small, medium, large] = await Promise.all([
      optimizeImage(file, { maxWidth: 400, quality: 0.75 }),
      optimizeImage(file, { maxWidth: 800, quality: 0.8 }),
      optimizeImage(file, { maxWidth: 1200, quality: 0.85 }),
    ]);

    return {
      small: small.url,
      medium: medium.url,
      large: large.url,
    };
  }, [optimizeImage]);

  return {
    isOptimizing,
    progress,
    optimizeImage,
    optimizeMultiple,
    generateThumbnail,
    generateResponsiveSet,
    supportsWebP: supportsWebP(),
  };
};

// Helper function to load image
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default useImageOptimization;
