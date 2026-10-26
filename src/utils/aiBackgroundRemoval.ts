type ProgressInfo = { status?: string; file?: string; progress?: number };
export type AIProgressCallback = (message: string) => void;

const RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL_ID = 'Orangebot/ormbg-ONNX';
type RawImageLike = { toBlob?: () => Promise<Blob>; toCanvas?: () => HTMLCanvasElement };
type Segmenter = (image: string) => Promise<RawImageLike[]>;
let runtimePromise: Promise<any> | null = null;
let gpuPromise: Promise<Segmenter> | null = null;
let wasmPromise: Promise<Segmenter> | null = null;

function progress(callback: AIProgressCallback | undefined, info: ProgressInfo) {
  if (!callback) return;
  if (typeof info.progress === 'number') callback('Downloading AI model files… ' + Math.round(info.progress) + '%');
  else if (info.status === 'done') callback('AI model file ready.');
  else if (info.status === 'download' || info.status === 'initiate') callback('Downloading AI model files for first use…');
  else if (info.status) callback('Preparing AI background-removal model…');
}
async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = import(/* @vite-ignore */ RUNTIME_URL).catch((error) => { runtimePromise = null; throw error; });
  }
  return runtimePromise;
}
async function getSegmenter(device: 'webgpu' | 'wasm', onProgress?: AIProgressCallback): Promise<Segmenter> {
  const existing = device === 'webgpu' ? gpuPromise : wasmPromise;
  if (existing) return existing;
  const pending = (async () => {
    const transformers = await getRuntime();
    return await transformers.pipeline('background-removal', MODEL_ID, {
      device,
      dtype: device === 'webgpu' ? 'fp16' : 'uint8',
      progress_callback: (info: ProgressInfo) => progress(onProgress, info),
    }) as Segmenter;
  })();
  if (device === 'webgpu') gpuPromise = pending; else wasmPromise = pending;
  try { return await pending; }
  catch (error) {
    if (device === 'webgpu') gpuPromise = null; else wasmPromise = null;
    throw error;
  }
}
async function toPng(output: RawImageLike[]): Promise<Blob> {
  const image = output?.[0];
  if (!image) throw new Error('The AI model did not return an image.');
  if (typeof image.toBlob === 'function') {
    const blob = await image.toBlob();
    if (blob.type === 'image/png') return blob;
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
      ctx.drawImage(bitmap, 0, 0);
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed.')), 'image/png'));
    } finally { bitmap.close(); }
  }
  if (typeof image.toCanvas === 'function') {
    return await new Promise<Blob>((resolve, reject) => image.toCanvas!().toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed.')), 'image/png'));
  }
  throw new Error('The AI model returned an unsupported image format.');
}
async function replaceBackground(blob: Blob, color: string): Promise<Blob> {
  if (color === 'transparent') return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is unavailable.');
    ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed.')), 'image/png'));
  } finally { bitmap.close(); }
}
export async function removeImageBackgroundAI(file: File, options: { replaceColor?: string; onProgress?: AIProgressCallback } = {}): Promise<{ blob: Blob; width: number; height: number }> {
  const localUrl = URL.createObjectURL(file);
  try {
    let output: RawImageLike[];
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        options.onProgress?.('Preparing AI model for GPU acceleration…');
        output = await (await getSegmenter('webgpu', options.onProgress))([localUrl]);
      } catch {
        gpuPromise = null;
        options.onProgress?.('GPU acceleration unavailable; switching to compatible CPU mode…');
        output = await (await getSegmenter('wasm', options.onProgress))([localUrl]);
      }
    } else {
      options.onProgress?.('Loading the AI model. First use downloads model files; this can take a while.');
      output = await (await getSegmenter('wasm', options.onProgress))(localUrl);
    }
    const cutout = await toPng(output);
    const blob = await replaceBackground(cutout, options.replaceColor || 'transparent');
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width, height = bitmap.height;
    bitmap.close();
    options.onProgress?.('Background removal complete.');
    return { blob, width, height };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('AI background removal failed. Check the connection for the initial model download and retry. ' + detail);
  } finally { URL.revokeObjectURL(localUrl); }
}
