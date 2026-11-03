type ProgressInfo = { status?: string; file?: string; progress?: number };
export type AIProgressCallback = (message: string) => void;

const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1';
// Prefer a well-supported background-removal model that works in browser
const MODEL_ID = 'Xenova/modnet';
type RawImageLike = {
  toBlob?: () => Promise<Blob>;
  toCanvas?: () => HTMLCanvasElement;
  data?: Uint8ClampedArray | Float32Array;
  width?: number;
  height?: number;
  channels?: number;
};
type Segmenter = (image: string | HTMLImageElement | HTMLCanvasElement) => Promise<RawImageLike | RawImageLike[]>;

let runtimePromise: Promise<any> | null = null;
let gpuPromise: Promise<Segmenter> | null = null;
let wasmPromise: Promise<Segmenter> | null = null;

function progress(callback: AIProgressCallback | undefined, info: ProgressInfo) {
  if (!callback) return;
  if (typeof info.progress === 'number') {
    callback('Downloading AI model files… ' + Math.round(info.progress) + '%');
  } else if (info.status === 'done') {
    callback('AI model file ready.');
  } else if (info.status === 'download' || info.status === 'initiate') {
    callback('Downloading AI model files for first use…');
  } else if (info.status) {
    callback('Preparing AI background-removal model…');
  }
}

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = import(/* @vite-ignore */ RUNTIME_URL).catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

async function getSegmenter(
  device: 'webgpu' | 'wasm',
  onProgress?: AIProgressCallback
): Promise<Segmenter> {
  const existing = device === 'webgpu' ? gpuPromise : wasmPromise;
  if (existing) return existing;

  const pending = (async () => {
    const transformers = await getRuntime();
    // Try background-removal pipeline first; fall back to image-segmentation if needed
    try {
      return (await transformers.pipeline('background-removal', MODEL_ID, {
        device,
        dtype: device === 'webgpu' ? 'fp16' : 'q8',
        progress_callback: (info: ProgressInfo) => progress(onProgress, info),
      })) as Segmenter;
    } catch {
      // Fallback model that is widely available
      return (await transformers.pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device,
        progress_callback: (info: ProgressInfo) => progress(onProgress, info),
      })) as Segmenter;
    }
  })();

  if (device === 'webgpu') gpuPromise = pending;
  else wasmPromise = pending;

  try {
    return await pending;
  } catch (error) {
    if (device === 'webgpu') gpuPromise = null;
    else wasmPromise = null;
    throw error;
  }
}

async function rawToPngCanvas(image: RawImageLike): Promise<HTMLCanvasElement> {
  if (typeof image.toCanvas === 'function') {
    return image.toCanvas();
  }
  if (typeof image.toBlob === 'function') {
    const blob = await image.toBlob();
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.drawImage(bitmap, 0, 0);
      return canvas;
    } finally {
      bitmap.close();
    }
  }
  // Raw tensor-like data (mask or RGBA)
  if (image.data && image.width && image.height) {
    const w = image.width;
    const h = image.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable.');
    const out = ctx.createImageData(w, h);
    const src = image.data;
    const channels = image.channels || (src.length / (w * h));
    for (let i = 0; i < w * h; i++) {
      const si = i * channels;
      if (channels >= 4) {
        out.data[i * 4] = src[si];
        out.data[i * 4 + 1] = src[si + 1];
        out.data[i * 4 + 2] = src[si + 2];
        out.data[i * 4 + 3] = src[si + 3];
      } else if (channels === 1) {
        // Single-channel mask → white subject on transparent
        const v = src[si] > 0.5 ? 255 : 0;
        out.data[i * 4] = 255;
        out.data[i * 4 + 1] = 255;
        out.data[i * 4 + 2] = 255;
        out.data[i * 4 + 3] = v;
      } else {
        out.data[i * 4] = src[si] || 0;
        out.data[i * 4 + 1] = src[si + 1] || 0;
        out.data[i * 4 + 2] = src[si + 2] || 0;
        out.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  }
  throw new Error('The AI model returned an unsupported image format.');
}

async function toPng(output: RawImageLike | RawImageLike[]): Promise<Blob> {
  const image = Array.isArray(output) ? output[0] : output;
  if (!image) throw new Error('The AI model did not return an image.');
  const canvas = await rawToPngCanvas(image);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png')
  );
}

async function replaceBackground(blob: Blob, color: string): Promise<Blob> {
  if (color === 'transparent') return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable.');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png')
    );
  } finally {
    bitmap.close();
  }
}

export async function removeImageBackgroundAI(
  file: File,
  options: { replaceColor?: string; onProgress?: AIProgressCallback } = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const localUrl = URL.createObjectURL(file);
  try {
    let output: RawImageLike | RawImageLike[];

    const tryDevice = async (device: 'webgpu' | 'wasm') => {
      const segmenter = await getSegmenter(device, options.onProgress);
      options.onProgress?.('Running AI segmentation…');
      return await segmenter(localUrl);
    };

    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        options.onProgress?.('Preparing AI model for GPU acceleration…');
        output = await tryDevice('webgpu');
      } catch {
        gpuPromise = null;
        options.onProgress?.('GPU unavailable; switching to CPU mode…');
        output = await tryDevice('wasm');
      }
    } else {
      options.onProgress?.('Loading AI model (first use downloads files; this can take a minute)…');
      output = await tryDevice('wasm');
    }

    const cutout = await toPng(output);
    const blob = await replaceBackground(cutout, options.replaceColor || 'transparent');
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    options.onProgress?.('Background removal complete.');
    return { blob, width, height };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      'AI background removal failed. Check your connection for the initial model download, then retry. ' +
        detail
    );
  } finally {
    URL.revokeObjectURL(localUrl);
  }
}
