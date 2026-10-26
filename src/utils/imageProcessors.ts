import JSZip from 'jszip';
import FileSaver from 'file-saver';
const saveAs = (FileSaver as any).saveAs || FileSaver;
import { jsPDF } from 'jspdf';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function loadImage(fileOrUrl: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrUrl);
    }
  });
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

// 1. COMPRESSOR
export async function compressImage(
  file: File,
  qualityPercent: number = 80,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  if (maxWidth && targetWidth > maxWidth) {
    const ratio = maxWidth / targetWidth;
    targetWidth = maxWidth;
    targetHeight = Math.round(targetHeight * ratio);
  }

  if (maxHeight && targetHeight > maxHeight) {
    const ratio = maxHeight / targetHeight;
    targetHeight = maxHeight;
    targetWidth = Math.round(targetWidth * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // If compressing PNG or preserving alpha, test mime type
  const isPng = file.type === 'image/png';
  let mimeType = file.type;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    mimeType = 'image/jpeg';
  }

  // Draw background white if jpeg
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // For JPEG and WebP, quality parameter works natively (0.01 to 1.0)
  // For PNG, canvas standard does not support lossy compression directly, so we export as WebP or JPEG if user asked or quantized canvas
  const effectiveMime = isPng ? 'image/png' : mimeType;
  const quality = Math.max(0.1, Math.min(1.0, qualityPercent / 100));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas compression failed'));
        resolve({ blob, width: targetWidth, height: targetHeight });
      },
      effectiveMime,
      quality
    );
  });
}

// 2. BACKGROUND REMOVER (Perimeter Flood-Fill & Perceptual Color Matting)
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface BgRemovalOptions {
  tolerance: number; // 5 to 100 (calibrated, default ~25)
  feather: number; // 0 to 5 (default 1.5)
  replaceColor?: string; // hex color or 'transparent'
  customKeyColor?: RGBColor | null;
  mode?: 'smart-boundary' | 'chroma-key'; // smart-boundary (floodfill from perimeter) vs global chroma-key
  protectInterior?: boolean; // default true: prevents face, eyes, hair, clothes inside subject from erasing
}

/**
 * Standard redmean perceptual color distance (ITU-R BT.601 / CIE weighted).
 * Max distance is ~765. Matches human perception of color differences far better than Euclidean RGB.
 */
export function perceptualColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rmean = (r1 + r2) >> 1;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8));
}

/**
 * Detects the dominant background color along the image perimeter using 5-bit color binning.
 * Rejects isolated foreground points (like a subject's hair, hand, or shoulder touching an edge).
 */
export function detectDominantBorderColor(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): RGBColor {
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));
  const histogram: Record<number, { count: number; rSum: number; gSum: number; bSum: number }> = {};

  const samplePixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // 5-bit quantization per channel (0..31)
    const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    if (!histogram[bin]) {
      histogram[bin] = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
    }
    histogram[bin].count++;
    histogram[bin].rSum += r;
    histogram[bin].gSum += g;
    histogram[bin].bSum += b;
  };

  // Sample top and bottom borders
  for (let x = 0; x < width; x += step) {
    samplePixel(x, 0);
    samplePixel(x, height - 1);
  }
  // Sample left and right borders
  for (let y = 0; y < height; y += step) {
    samplePixel(0, y);
    samplePixel(width - 1, y);
  }

  let bestBin = -1;
  let maxCount = -1;
  for (const binStr in histogram) {
    const bin = Number(binStr);
    if (histogram[bin].count > maxCount) {
      maxCount = histogram[bin].count;
      bestBin = bin;
    }
  }

  if (bestBin !== -1 && histogram[bestBin]) {
    const entry = histogram[bestBin];
    return {
      r: Math.round(entry.rSum / entry.count),
      g: Math.round(entry.gSum / entry.count),
      b: Math.round(entry.bSum / entry.count),
    };
  }

  return { r: data[0], g: data[1], b: data[2] };
}

/**
 * Generates an alpha mask (0 = full transparent/background, 255 = foreground)
 * with perimeter-seeded flood fill so that interior features (face, eyes, hair, clothes)
 * are NEVER erased even if their color happens to match the background!
 */
export function generateBackgroundAlphaMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: {
    targetColor: RGBColor;
    tolerance: number;
    feather?: number;
    mode?: 'smart-boundary' | 'chroma-key';
  }
): Uint8Array {
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  mask.fill(255); // Default all pixels to foreground

  const { targetColor, tolerance, feather = 1.5, mode = 'smart-boundary' } = options;
  // Calibrate threshold from tolerance (range 5..100 -> ~16..~320 in perceptual distance)
  const threshold = Math.max(12, tolerance * 3.2);

  if (mode === 'chroma-key') {
    // Global chroma key across all pixels
    for (let i = 0; i < totalPixels; i++) {
      const pIdx = i * 4;
      const dist = perceptualColorDistance(
        data[pIdx],
        data[pIdx + 1],
        data[pIdx + 2],
        targetColor.r,
        targetColor.g,
        targetColor.b
      );
      if (dist <= threshold) {
        mask[i] = 0;
      }
    }
  } else {
    // Smart Edge-Connected Flood Fill:
    // Starts ONLY from pixels along the image perimeter that match the target background.
    // Flood fill proceeds inwards, so enclosed interior regions (face, eyes, pupils, dark clothes)
    // are completely protected and cannot be reached or erased!
    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const pushSeed = (x: number, y: number) => {
      const idx = y * width + x;
      if (visited[idx]) return;
      const pIdx = idx * 4;
      const dist = perceptualColorDistance(
        data[pIdx],
        data[pIdx + 1],
        data[pIdx + 2],
        targetColor.r,
        targetColor.g,
        targetColor.b
      );
      if (dist <= threshold * 1.15) {
        visited[idx] = 1;
        mask[idx] = 0;
        queue[tail++] = idx;
      }
    };

    // Seed from all 4 borders
    for (let x = 0; x < width; x++) {
      pushSeed(x, 0);
      pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      pushSeed(0, y);
      pushSeed(width - 1, y);
    }

    // 4-way BFS flood-fill inwards from the perimeter
    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = Math.floor(curr / width);

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < width - 1 ? curr + 1 : -1,
        cy > 0 ? curr - width : -1,
        cy < height - 1 ? curr + width : -1,
      ];

      for (const nIdx of neighbors) {
        if (nIdx !== -1 && !visited[nIdx]) {
          visited[nIdx] = 1;
          const pIdx = nIdx * 4;
          const dist = perceptualColorDistance(
            data[pIdx],
            data[pIdx + 1],
            data[pIdx + 2],
            targetColor.r,
            targetColor.g,
            targetColor.b
          );

          if (dist <= threshold) {
            mask[nIdx] = 0; // background
            queue[tail++] = nIdx;
          }
        }
      }
    }
  }

  // Feather edge transitions between background (0) and foreground (255)
  if (feather > 0) {
    const featherRadius = Math.min(5, Math.max(1, Math.round(feather)));
    const edgeMask = new Uint8Array(mask);
    for (let y = featherRadius; y < height - featherRadius; y++) {
      for (let x = featherRadius; x < width - featherRadius; x++) {
        const idx = y * width + x;
        if (mask[idx] === 0) continue; // Already background

        let minDist = featherRadius + 1;
        for (let dy = -featherRadius; dy <= featherRadius; dy++) {
          for (let dx = -featherRadius; dx <= featherRadius; dx++) {
            if (mask[(y + dy) * width + (x + dx)] === 0) {
              const d = Math.hypot(dx, dy);
              if (d < minDist) minDist = d;
            }
          }
        }

        if (minDist <= featherRadius) {
          // Soft alpha rolloff
          edgeMask[idx] = Math.round((minDist / (featherRadius + 1)) * 255);
        }
      }
    }
    return edgeMask;
  }

  return mask;
}

export async function removeImageBackground(
  file: File,
  options: BgRemovalOptions = { tolerance: 25, feather: 1.5, replaceColor: 'transparent' }
): Promise<{ blob: Blob; width: number; height: number; detectedBgColor?: RGBColor }> {
  const img = await loadImage(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height || width * height > 12_000_000) throw new Error('Image is too large for color-based processing. Use an image at or below 12 megapixels.');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Determine target background color
  const detectedBg = detectDominantBorderColor(data, width, height);
  const targetColor = options.customKeyColor || detectedBg;

  // Generate alpha mask with boundary protection
  const alphaMask = generateBackgroundAlphaMask(data, width, height, {
    targetColor,
    tolerance: options.tolerance ?? 25,
    feather: options.feather ?? 1.5,
    mode: options.mode ?? (options.protectInterior === false ? 'chroma-key' : 'smart-boundary'),
  });

  // Apply alpha mask to image pixels
  for (let i = 0; i < alphaMask.length; i++) {
    const alpha = alphaMask[i];
    const pIdx = i * 4;
    if (alpha === 0) {
      data[pIdx + 3] = 0;
    } else if (alpha < 255) {
      data[pIdx + 3] = Math.round((data[pIdx + 3] * alpha) / 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // If user requested solid replacement color instead of transparent
  if (options.replaceColor && options.replaceColor !== 'transparent') {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outCtx = outputCanvas.getContext('2d');
    if (outCtx) {
      outCtx.fillStyle = options.replaceColor;
      outCtx.fillRect(0, 0, width, height);
      outCtx.drawImage(canvas, 0, 0);
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to generate image'));
          resolve({ blob, width, height, detectedBgColor: targetColor });
        }, 'image/png');
      });
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to remove background'));
      resolve({ blob, width, height, detectedBgColor: targetColor });
    }, 'image/png');
  });
}

// 3. RESIZER
export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  qualityPercent: number = 90,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/jpeg'
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Resize failed'));
        resolve({ blob, width: canvas.width, height: canvas.height });
      },
      format,
      qualityPercent / 100
    );
  });
}

// 4. CROPPER
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
}

export function calculateAspectRatioCrop(
  imgWidth: number,
  imgHeight: number,
  aspect: 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2'
): { x: number; y: number; width: number; height: number } {
  if (aspect === 'free') {
    return { x: 0, y: 0, width: imgWidth, height: imgHeight };
  }
  let targetRatio = 1;
  if (aspect === '1:1') targetRatio = 1;
  else if (aspect === '16:9') targetRatio = 16 / 9;
  else if (aspect === '9:16') targetRatio = 9 / 16;
  else if (aspect === '4:3') targetRatio = 4 / 3;
  else if (aspect === '3:2') targetRatio = 3 / 2;

  let boxW = imgWidth;
  let boxH = imgWidth / targetRatio;

  if (boxH > imgHeight) {
    boxH = imgHeight;
    boxW = imgHeight * targetRatio;
  }

  const x = Math.max(0, (imgWidth - boxW) / 2);
  const y = Math.max(0, (imgHeight - boxH) / 2);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(boxW)),
    height: Math.max(1, Math.round(boxH)),
  };
}

export async function cropImage(
  file: File,
  crop: CropRect,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const rotation = ((crop.rotation || 0) % 360 + 360) % 360;
  const flipH = !!crop.flipH;
  const flipV = !!crop.flipV;

  let sourceCanvas: HTMLCanvasElement | HTMLImageElement = img;
  if (rotation !== 0 || flipH || flipV) {
    const tCanvas = document.createElement('canvas');
    const isSideways = rotation === 90 || rotation === 270;
    tCanvas.width = isSideways ? img.naturalHeight : img.naturalWidth;
    tCanvas.height = isSideways ? img.naturalWidth : img.naturalHeight;
    const tCtx = tCanvas.getContext('2d');
    if (tCtx) {
      tCtx.translate(tCanvas.width / 2, tCanvas.height / 2);
      tCtx.rotate((rotation * Math.PI) / 180);
      tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      tCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      sourceCanvas = tCanvas;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Cropping failed'));
      resolve({ blob, width: canvas.width, height: canvas.height });
    }, format, 0.95);
  });
}

// 5. JPG TO PNG
export async function convertJpgToPng(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG conversion failed'));
      resolve({ blob, width: canvas.width, height: canvas.height });
    }, 'image/png');
  });
}

// 6. PNG TO JPG
export async function convertPngToJpg(
  file: File,
  qualityPercent: number = 92,
  bgColor: string = '#FFFFFF'
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Fill solid background for transparent pixels
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('JPG conversion failed'));
        resolve({ blob, width: canvas.width, height: canvas.height });
      },
      'image/jpeg',
      qualityPercent / 100
    );
  });
}

// 7. WEBP CONVERTER
export async function convertToWebP(
  file: File,
  qualityPercent: number = 85
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('WebP conversion failed'));
        resolve({ blob, width: canvas.width, height: canvas.height });
      },
      'image/webp',
      qualityPercent / 100
    );
  });
}

// 8. IMAGE TO PDF
export interface PdfOptions {
  orientation: 'p' | 'l' | 'auto';
  pageSize: 'a4' | 'letter' | 'fit';
  margin: number; // in mm (0, 10, 20)
}

export async function generatePdfFromImages(
  files: File[],
  options: PdfOptions = { orientation: 'auto', pageSize: 'a4', margin: 10 }
): Promise<Blob> {
  if (files.length === 0) throw new Error('No images selected');

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: options.pageSize === 'fit' ? 'a4' : options.pageSize,
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const img = await loadImage(file);
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const isLandscape = imgWidth > imgHeight;

    const pageOrientation =
      options.orientation === 'auto'
        ? isLandscape
          ? 'l'
          : 'p'
        : options.orientation;

    if (i > 0) {
      pdf.addPage(options.pageSize === 'fit' ? [imgWidth, imgHeight] : options.pageSize, pageOrientation);
    } else {
      // Configure first page orientation
      if (pageOrientation === 'l') {
        // Adjust page size orientation
        pdf.setPage(1);
      }
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = options.pageSize === 'fit' ? 0 : options.margin;

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const widthRatio = availableWidth / imgWidth;
    const heightRatio = availableHeight / imgHeight;
    const scale = Math.min(widthRatio, heightRatio);

    const printWidth = imgWidth * scale;
    const printHeight = imgHeight * scale;

    const x = margin + (availableWidth - printWidth) / 2;
    const y = margin + (availableHeight - printHeight) / 2;

    // Convert image to data url for jsPDF
    const canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(dataUrl, 'JPEG', x, y, printWidth, printHeight);
    }
  }

  return pdf.output('blob');
}

// BATCH ZIP EXPORT
export async function downloadZip(
  items: { blob: Blob; filename: string }[],
  zipFilename: string = 'picshrink-images.zip'
): Promise<void> {
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(item.filename, item.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipFilename);
}

// 9. PHOTO FILTERS (Canvas API)
export interface FilterSettings {
  grayscale: number; // 0 to 100%
  sepia: number; // 0 to 100%
  invert: number; // 0 to 100%
  blur: number; // 0 to 20px
  brightness: number; // 0 to 200%, default 100%
  contrast: number; // 0 to 200%, default 100%
  saturate: number; // 0 to 200%, default 100%
  hueRotate: number; // 0 to 360deg, default 0
}

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
};

export async function applyImageFilters(
  file: File,
  filters: FilterSettings,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  qualityPercent: number = 90
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Build Canvas 2D filter string
  const filterParts: string[] = [];
  if (filters.grayscale > 0) filterParts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.sepia > 0) filterParts.push(`sepia(${filters.sepia}%)`);
  if (filters.invert > 0) filterParts.push(`invert(${filters.invert}%)`);
  if (filters.blur > 0) filterParts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 100) filterParts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== 100) filterParts.push(`contrast(${filters.contrast}%)`);
  if (filters.saturate !== 100) filterParts.push(`saturate(${filters.saturate}%)`);
  if (filters.hueRotate !== 0) filterParts.push(`hue-rotate(${filters.hueRotate}deg)`);

  ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Filter application failed'));
        resolve({ blob, width: canvas.width, height: canvas.height });
      },
      format,
      qualityPercent / 100
    );
  });
}

