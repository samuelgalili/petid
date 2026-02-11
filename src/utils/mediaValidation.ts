/**
 * Media validation utilities based on platform spec:
 * - Profile picture: 200x200px minimum
 * - Video cover/reel: 1080x1920 (9:16)
 * - Ad formats: 720x1280 (portrait), 1280x720 (landscape), 640x640 (square)
 * - Max file sizes: 50MB video, 10MB image
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export const MEDIA_SPECS = {
  profilePicture: { minWidth: 200, minHeight: 200, maxFileSizeMB: 5 },
  video: { width: 1080, height: 1920, maxFileSizeMB: 50 },
  adPortrait: { width: 720, height: 1280 },
  adLandscape: { width: 1280, height: 720 },
  adSquare: { width: 640, height: 640 },
  feedImage: { maxFileSizeMB: 10 },
} as const;

export function getImageDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function getVideoDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    video.src = URL.createObjectURL(file);
  });
}

export function validateProfilePicture(dimensions: MediaDimensions): ValidationResult {
  const { minWidth, minHeight } = MEDIA_SPECS.profilePicture;
  if (dimensions.width < minWidth || dimensions.height < minHeight) {
    return {
      valid: false,
      error: `תמונת פרופיל חייבת להיות לפחות ${minWidth}x${minHeight} פיקסלים. התמונה שנבחרה: ${dimensions.width}x${dimensions.height}`,
    };
  }
  return { valid: true };
}

export function validateVideoResolution(dimensions: MediaDimensions): ValidationResult {
  const aspectRatio = dimensions.width / dimensions.height;
  const targetRatio = 9 / 16;
  const tolerance = 0.05;

  if (Math.abs(aspectRatio - targetRatio) > tolerance) {
    return {
      valid: false,
      error: `וידאו חייב להיות ביחס 9:16 (לדוגמה 1080x1920). הוידאו שנבחר: ${dimensions.width}x${dimensions.height}`,
    };
  }
  return { valid: true };
}

export function getAdAspectRatio(dimensions: MediaDimensions): 'portrait' | 'landscape' | 'square' {
  const ratio = dimensions.width / dimensions.height;
  if (ratio < 0.7) return 'portrait';
  if (ratio > 1.3) return 'landscape';
  return 'square';
}

export function validateFileSize(file: File, maxSizeMB: number): ValidationResult {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `גודל הקובץ מקסימלי: ${maxSizeMB}MB. הקובץ שנבחר: ${sizeMB.toFixed(1)}MB`,
    };
  }
  return { valid: true };
}
