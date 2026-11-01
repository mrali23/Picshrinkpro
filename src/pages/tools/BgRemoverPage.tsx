import React, { useState, useEffect, useRef } from 'react';
import { Download, Sliders, Scissors, Trash2, Pipette, Columns, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { RelatedTools } from '../../components/common/RelatedTools';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { BatchQueueManager } from '../../components/common/BatchQueueManager';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import { removeImageBackground, downloadZip, formatFileSize, type RGBColor } from '../../utils/imageProcessors';
import { removeImageBackgroundAI } from '../../utils/aiBackgroundRemoval';
import { saveAs } from 'file-saver';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'bg-remover')!;

function isRGBColor(value: unknown): value is RGBColor {
  return typeof value === 'object' && value !== null &&
    'r' in value && typeof value.r === 'number' &&
    'g' in value && typeof value.g === 'number' &&
    'b' in value && typeof value.b === 'number';
}

export function BgRemoverPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [tolerance, setTolerance] = useState<number>(25);
  const [feather, setFeather] = useState<number>(1.5);
  const [removalMode, setRemovalMode] = useState<'ai' | 'smart-boundary' | 'chroma-key'>('ai');
  const [replaceColor, setReplaceColor] = useState<string>('transparent');
  const [customKeyColor, setCustomKeyColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [detectedBgColor, setDetectedBgColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [processingNote, setProcessingNote] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImgRef = useRef<HTMLImageElement>(null);

  const imagesRef = useRef<ProcessedImage[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    for (const item of imagesRef.current) {
      URL.revokeObjectURL(item.originalPreviewUrl);
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    }
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 15 * 1024 * 1024;
    const maxPixels = 12_000_000;

    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        rejected.push(file.name + ': use JPG, PNG, or WebP.');
        continue;
      }
      if (file.size > maxBytes) {
        rejected.push(file.name + ': file exceeds the 15 MB limit.');
        continue;
      }
      let bitmap: ImageBitmap | undefined;
      try {
        bitmap = await createImageBitmap(file);
        if (bitmap.width * bitmap.height > maxPixels) {
          rejected.push(file.name + ': image exceeds the 12-megapixel limit.');
          continue;
        }
        accepted.push(file);
      } catch {
        rejected.push(file.name + ': the image could not be decoded.');
      } finally {
        bitmap?.close();
      }
    }

    setUploadMessage(rejected.length ? 'Some files were not added. ' + rejected.join(' ') : '');
    if (!accepted.length) return;

    const newItems: ProcessedImage[] = accepted.map((file) => ({
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : Date.now() + '-' + Math.random().toString(36).slice(2, 10),
      originalFile: file,
      originalName: file.name,
      originalSize: file.size,
      originalPreviewUrl: URL.createObjectURL(file),
      status: 'idle',
    }));

    setImages((prev) => {
      const combined = [...prev, ...newItems];
      if (!selectedImageId && combined.length > 0) {
        setSelectedImageId(combined[0].id);
      }
      return combined;
    });
  };

  useEffect(() => {
    if (images.length === 0) return;

    let isMounted = true;
    setIsProcessing(true);
    setProcessingNote(removalMode === 'ai'
      ? 'Preparing AI segmentation… first use downloads model files.'
      : 'Removing a similar-colored background…');

    const runRemoval = async () => {
      const results = [...images];
      // Limit concurrent full-resolution processing to keep browser memory use predictable.
      for (let idx = 0; idx < images.length; idx++) {
        if (!isMounted) return;
        const item = images[idx];
        try {
          const result = removalMode === 'ai'
            ? await removeImageBackgroundAI(item.originalFile, {
                replaceColor,
                onProgress: (note) => { if (isMounted) setProcessingNote(note); },
              })
            : await removeImageBackground(item.originalFile, {
                tolerance,
                feather,
                replaceColor,
                customKeyColor,
                mode: removalMode,
              });
          if (!isMounted) return;
          if ('detectedBgColor' in result && isRGBColor(result.detectedBgColor) && !customKeyColor) {
            setDetectedBgColor(result.detectedBgColor);
          }
          if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
          const processedUrl = URL.createObjectURL(result.blob);
          results[idx] = {
            ...item,
            processedBlob: result.blob,
            processedUrl,
            processedSize: result.blob.size,
            processedWidth: result.width,
            processedHeight: result.height,
            status: 'done' as const,
            error: undefined,
          };
          setImages([...results]);
        } catch (err: unknown) {
          if (!isMounted) return;
          results[idx] = {
            ...item,
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Background removal failed',
          };
          setImages([...results]);
        }
      }
      if (isMounted) {
        setImages(results);
        setIsProcessing(false);
        setProcessingNote('');
      }
    };

    runRemoval();

    return () => {
      isMounted = false;
    };
  }, [tolerance, feather, replaceColor, customKeyColor, removalMode, images.map((i) => i.id).join(',')]);

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-nobg.png`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}-nobg.png`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-background-removed.zip');
    }
  };

  const handlePickColorFromImage = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isEyedropperActive) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, x * scaleX, y * scaleY, 1, 1, 0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      setCustomKeyColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
      setIsEyedropperActive(false);
    }
  };

  const activeImage = images.find((i) => i.id === selectedImageId) || images[0];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SEOHead
        title={toolMeta.title}
        description={toolMeta.description}
        path={toolMeta.path}
      />

      {/* Hidden file input for BatchQueueManager "Add More" */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={toolMeta.acceptedTypes}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* H1 & Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-100 text-pink-700 mb-3">
            <Scissors className="w-3.5 h-3.5" /> AI Background Removal
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Free Background Remover
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Create transparent PNG cutouts with AI segmentation in your browser. The first use downloads model files; your selected image itself is processed locally.
          </p>
        </div>

        {/* AdSense Top Placeholder */}
        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            {uploadMessage && <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{uploadMessage}</p>}
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to remove background"
              description="JPG, PNG, and WebP • up to 15 MB and 12 megapixels per image"
            />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Preview & Before/After Slider */}
            <div className="lg:col-span-8 space-y-6">
              {activeImage && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {activeImage.originalName}
                      </h3>
                      <span className="text-xs text-slate-500">
                        Original: {formatFileSize(activeImage.originalSize)} • True Alpha PNG Output
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode('slider')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            viewMode === 'slider'
                              ? 'bg-white text-pink-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Slider</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('side-by-side')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            viewMode === 'side-by-side'
                              ? 'bg-white text-pink-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Side-by-Side</span>
                        </button>
                      </div>

                      {activeImage.processedBlob && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(activeImage)}
                          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Cutout
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Comparison Area */}
                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Removing background from ${activeImage.originalName}...`}
                        subText={processingNote || (removalMode === 'ai' ? 'AI segmentation runs in the browser; the first model download may take a while.' : 'Color-distance masking and edge feathering in your browser.')}
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                            <span>Updating background cutout...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          /* Interactive Before/After Drag Slider with Eyedropper Support */
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel="Original Photo"
                            processedLabel="Transparent Cutout"
                            isTransparentBg={replaceColor === 'transparent'}
                            isEyedropperActive={isEyedropperActive}
                            onColorPick={(rgb) => {
                              setCustomKeyColor(rgb);
                              setIsEyedropperActive(false);
                            }}
                          />
                        ) : (
                        /* Side-by-Side */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                              <span>Original (Click to pick color)</span>
                              {isEyedropperActive && (
                                <span className="text-pink-600 font-bold animate-pulse">
                                  Click anywhere on image!
                                </span>
                              )}
                            </div>
                            <div
                              className={`h-72 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-2 relative ${
                                isEyedropperActive ? 'cursor-crosshair ring-2 ring-pink-500' : ''
                              }`}
                            >
                              <img
                                ref={originalImgRef}
                                src={activeImage.originalPreviewUrl}
                                alt="Original"
                                onClick={handlePickColorFromImage}
                                className="max-h-full max-w-full object-contain rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                              <span>Removed Background</span>
                              <span className="text-emerald-600 font-bold">Transparent PNG</span>
                            </div>
                            <div
                              className="h-72 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden p-2 relative"
                              style={{
                                backgroundImage:
                                  replaceColor === 'transparent'
                                    ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)'
                                    : 'none',
                                backgroundColor:
                                  replaceColor === 'transparent' ? '#ffffff' : replaceColor,
                                backgroundSize: '16px 16px',
                                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                              }}
                            >
                              <img
                                src={activeImage.processedUrl}
                                alt="Background removed"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                  </div>
                </div>
              )}

              {/* Batch Processing Queue Interface */}
              <BatchQueueManager
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={(id) => setSelectedImageId(id)}
                onRemoveImage={(id) => {
                  const removed = images.find((item) => item.id === id);
                  if (removed) { URL.revokeObjectURL(removed.originalPreviewUrl); if (removed.processedUrl) URL.revokeObjectURL(removed.processedUrl); }
                  setImages((prev) => {
                    const filtered = prev.filter((i) => i.id !== id);
                    if (selectedImageId === id) setSelectedImageId(filtered[0]?.id || null);
                    return filtered;
                  });
                }}
                onClearAll={() => {
                  for (const item of images) { URL.revokeObjectURL(item.originalPreviewUrl); if (item.processedUrl) URL.revokeObjectURL(item.processedUrl); }
                  setImages([]);
                  setSelectedImageId(null);
                }}
                onDownloadSingle={handleDownloadSingle}
                onDownloadAllZip={handleDownloadAllZip}
                onAddFilesClick={() => fileInputRef.current?.click()}
                isProcessing={isProcessing}
                zipButtonText="Download All Cutouts as ZIP"
              />
            </div>

            {/* Right: Settings & Color Replacement */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-pink-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Removal Controls</h3>
                  </div>
                </div>

                {/* Removal Method Selection */}
                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-2">
                    Removal Method
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setRemovalMode('ai')}
                      className={removalMode === 'ai' ? 'p-3 rounded-2xl border text-left transition-all bg-pink-50/80 border-pink-500 ring-2 ring-pink-500/30' : 'p-3 rounded-2xl border text-left transition-all bg-slate-50 border-slate-200 hover:bg-slate-100/70'}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-pink-600" />
                          AI Subject Segmentation
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Recommended</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Uses an ONNX segmentation model in the browser. Initial model download is large; the photo stays local.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemovalMode('smart-boundary')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        removalMode === 'smart-boundary'
                          ? 'bg-pink-50/80 border-pink-500 ring-2 ring-pink-500/30'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-pink-600" />
                          Color-Based Smart Boundary
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Removes similarly colored pixels connected to image edges. Best for plain backgrounds; can affect similar-colored subject details.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRemovalMode('chroma-key')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        removalMode === 'chroma-key'
                          ? 'bg-pink-50/80 border-pink-500 ring-2 ring-pink-500/30'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-slate-600" />
                          Global Chroma-Key
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Strips all matching pixels everywhere across the image (ideal for green screen backdrops).
                      </p>
                    </button>
                  </div>
                </div>

{removalMode !== 'ai' && (
                <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-800">
                      Target Color
                    </label>
                    {customKeyColor ? (
                      <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300"
                          style={{
                            backgroundColor: `rgb(${customKeyColor.r}, ${customKeyColor.g}, ${customKeyColor.b})`,
                          }}
                        />
                        Custom RGB({customKeyColor.r}, {customKeyColor.g}, {customKeyColor.b})
                      </span>
                    ) : detectedBgColor ? (
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300"
                          style={{
                            backgroundColor: `rgb(${detectedBgColor.r}, ${detectedBgColor.g}, ${detectedBgColor.b})`,
                          }}
                        />
                        Auto-Detected ({detectedBgColor.r}, {detectedBgColor.g}, {detectedBgColor.b})
                      </span>
                    ) : null}
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setCustomKeyColor(null)}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-all ${
                        customKeyColor === null
                          ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomKeyColor({ r: 10, g: 10, b: 10 })}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                      Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomKeyColor({ r: 250, g: 250, b: 250 })}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-white border border-slate-300"></span>
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomKeyColor({ r: 0, g: 255, b: 0 })}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Green
                    </button>
                  </div>

                  {/* Eyedropper Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== 'undefined' && 'EyeDropper' in window) {
                        try {
                          const eyeDropper = new (window as any).EyeDropper();
                          const result = await eyeDropper.open();
                          if (result && result.sRGBHex) {
                            const hex = result.sRGBHex;
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            setCustomKeyColor({ r, g, b });
                            setIsEyedropperActive(false);
                            return;
                          }
                        } catch {
                          // Continue to manual click
                        }
                      }
                      setIsEyedropperActive(!isEyedropperActive);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isEyedropperActive
                        ? 'bg-pink-600 text-white border-pink-600 shadow-md ring-2 ring-pink-500/40 animate-pulse'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Pipette className="w-4 h-4" />
                    <span>
                      {isEyedropperActive ? 'Click anywhere on image to pick color...' : 'Sample Color with Eyedropper'}
                    </span>
                  </button>
                </div>
                </>
                )}

                {removalMode === 'ai' ? (
                  <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
                    AI mode performs foreground segmentation. Tolerance, eyedropper, and feather settings apply to the color-based modes only.
                  </p>
                ) : (
                  <>
                {/* Tolerance Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-700">Tolerance</label>
                    <span className="text-sm font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                      {tolerance}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Gentle (5)</span>
                    <span>Aggressive (80)</span>
                  </div>
                </div>

                {/* Feather Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-slate-700">Edge Feathering</label>
                    <span className="text-sm font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                      {feather}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={feather}
                    onChange={(e) => setFeather(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Crisp 0px</span>
                    <span>Soft 5px</span>
                  </div>
                </div>
                  </>
                )}

                {/* Background Replacement Options */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2.5">
                    Background Output
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReplaceColor('transparent')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        replaceColor === 'transparent'
                          ? 'border-pink-600 bg-pink-50 text-pink-700 ring-1 ring-pink-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center text-[10px]">
                        ▦
                      </span>
                      <span>Transparent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplaceColor('#FFFFFF')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        replaceColor === '#FFFFFF'
                          ? 'border-pink-600 bg-pink-50 text-pink-700 ring-1 ring-pink-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shadow-xs"></span>
                      <span>White Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplaceColor('#000000')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        replaceColor === '#000000'
                          ? 'border-pink-600 bg-pink-50 text-pink-700 ring-1 ring-pink-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-300 bg-black"></span>
                      <span>Solid Black</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplaceColor('#2563EB')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        replaceColor === '#2563EB'
                          ? 'border-pink-600 bg-pink-50 text-pink-700 ring-1 ring-pink-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-300 bg-blue-600"></span>
                      <span>Royal Blue</span>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Download All as ZIP ({images.length})</span>
                  </button>

                  {activeImage && (
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(activeImage)}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Cutout PNG</span>
                    </button>
                  )}
                </div>
              </div>

              <AdBanner type="sidebar" />
            </div>
          </div>
        )}

        <AdBanner type="bottom" />

        <FaqSection
          faqs={toolMeta.faqs}
          title="Background Removal FAQs"
          subtitle="AI segmentation is the default. Color-based methods remain available for simple plain-color backgrounds."
        />
        <RelatedTools toolId={toolMeta.id} />
      </div>
    </div>
  );
}
