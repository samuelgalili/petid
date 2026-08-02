const ALLOWED_REFERENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("לא הצלחנו להכין את התמונה"));
  }, "image/jpeg", quality);
});

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("לא הצלחנו לקרוא את התמונה"));
  };
  image.src = objectUrl;
});

/**
 * Normalizes phone photos before upload. A canvas-rendered 1600px JPEG keeps
 * coat markings and facial detail, strips EXIF/GPS metadata, and avoids both
 * multi-megabyte originals and any video workflow.
 */
export const preparePetCharacterPhoto = async (file: File): Promise<File> => {
  if (!ALLOWED_REFERENCE_TYPES.has(file.type)) {
    throw new Error("אפשר להעלות תמונות JPG, PNG או WebP בלבד");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("כל תמונה יכולה להיות בגודל של עד 10MB");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("לא הצלחנו להכין את התמונה");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasBlob(canvas, 0.9);
  if (blob.size > MAX_OUTPUT_BYTES) blob = await canvasBlob(canvas, 0.76);
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new Error("התמונה עדיין גדולה מדי — נסו תמונה אחרת");
  }
  const baseName = file.name.replace(/\.[^.]+$/, "") || "pet";
  return new File([blob], `${baseName}-mipo.jpg`, { type: "image/jpeg" });
};
