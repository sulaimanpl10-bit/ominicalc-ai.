/**
 * Image processing utilities for AI Camera Math Solver:
 * - High-fidelity downscaling/compression to optimize token latency while keeping math text razor sharp
 * - Rotation (90-degree steps)
 * - Canvas-based cropping
 */

export interface ProcessedImage {
  base64: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeKb: number;
}

/**
 * Compresses and optionally rotates or crops an image file or dataURL.
 * Max dimension 1280px keeps equations, small superscripts, and fractions crystal clear
 * while reducing transfer size to ~100-300KB.
 */
export async function processMathImage(
  source: File | Blob | string,
  options: {
    rotationDeg?: number;
    cropRect?: { x: number; y: number; width: number; height: number }; // normalized 0-1
    maxDimension?: number;
    quality?: number;
  } = {}
): Promise<ProcessedImage> {
  const { rotationDeg = 0, cropRect, maxDimension = 1280, quality = 0.88 } = options;

  let img: HTMLImageElement;
  if (typeof source === 'string') {
    img = await loadImageFromUrl(source);
  } else {
    const objectUrl = URL.createObjectURL(source);
    try {
      img = await loadImageFromUrl(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  const rad = ((rotationDeg % 360) * Math.PI) / 180;
  const isRotated90or270 = Math.abs(rotationDeg % 180) === 90;

  // Source dimensions
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Compute crop box in source pixels
  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (cropRect) {
    cropX = Math.max(0, Math.min(srcW, cropRect.x * srcW));
    cropY = Math.max(0, Math.min(srcH, cropRect.y * srcH));
    cropW = Math.max(10, Math.min(srcW - cropX, cropRect.width * srcW));
    cropH = Math.max(10, Math.min(srcH - cropY, cropRect.height * srcH));
  }

  // Determine scale down factor based on maxDimension
  const activeW = isRotated90or270 ? cropH : cropW;
  const activeH = isRotated90or270 ? cropW : cropH;

  let scale = 1;
  if (Math.max(activeW, activeH) > maxDimension) {
    scale = maxDimension / Math.max(activeW, activeH);
  }

  const destW = Math.round(activeW * scale);
  const destH = Math.round(activeH * scale);

  canvas.width = destW;
  canvas.height = destH;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply transformation for rotation
  ctx.save();
  ctx.translate(destW / 2, destH / 2);
  ctx.rotate(rad);

  const drawW = Math.round((isRotated90or270 ? destH : destW));
  const drawH = Math.round((isRotated90or270 ? destW : destH));

  // Draw cropped slice
  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const sizeKb = Math.round((base64.length * 3) / 4 / 1024);

  return {
    base64,
    dataUrl,
    mimeType: 'image/jpeg',
    width: destW,
    height: destH,
    sizeKb,
  };
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image into memory'));
    img.src = url;
  });
}
