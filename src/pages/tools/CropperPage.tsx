import { useState, useRef, useEffect } from 'react';
import {
  Download,
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Columns,
  SlidersHorizontal,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
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
import {
  cropImage,
  loadImage,
  formatFileSize,
  downloadZip,
  calculateAspectRatioCrop,
  getImageDimensions,
} from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';
import { analytics } from '../../utils/analytics';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'cropper')!;

type AspectPreset = 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2';

export function CropperPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectPreset>('1:1');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 400,
    height: 400,
  });
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'crop' | 'slider' | 'side-by-side'>('crop');

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeImage = images.find((i) => i.id === selectedImageId) || images[0];

  const handleFilesSelected = (files: File[]) => {
    const newItems: ProcessedImage[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
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

  // Recalculate crop box when active image or aspect preset changes
  useEffect(() => {
    if (!activeImage) return;

    loadImage(activeImage.originalFile).then((img) => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const crop = calculateAspectRatioCrop(imgW, imgH, aspect);
      setCropBox(crop);
    });
  }, [activeImage?.id, aspect]);

  // Crop the currently selected image
  const executeSingleCrop = async () => {
    if (!activeImage) return;
    setIsProcessing(true);

    try {
      const { blob, width, height } = await cropImage(
        activeImage.originalFile,
        {
          ...cropBox,
          rotation,
          flipH,
          flipV,
        },
        'image/png'
      );
      const processedUrl = URL.createObjectURL(blob);

      setImages((prev) =>
        prev.map((img) =>
          img.id === activeImage.id
            ? {
                ...img,
                processedBlob: blob,
                processedUrl,
                processedSize: blob.size,
                processedWidth: width,
                processedHeight: height,
                status: 'done',
              }
            : img
        )
      );

      // Auto-switch to slider view if completed
      setViewMode('slider');
      analytics.trackToolUsage('Image Cropper', '/cropper', Math.max(0, activeImage.originalSize - blob.size));
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch crop all queued images simultaneously!
  const executeBatchCropAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const updated = await Promise.all(
        images.map(async (item) => {
          try {
            const dims =
              item.originalWidth && item.originalHeight
                ? { width: item.originalWidth, height: item.originalHeight }
                : await getImageDimensions(item.originalFile);

            const crop = calculateAspectRatioCrop(dims.width, dims.height, aspect);
            const { blob, width, height } = await cropImage(
              item.originalFile,
              {
                ...crop,
                rotation,
                flipH,
                flipV,
              },
              'image/png'
            );
            const processedUrl = URL.createObjectURL(blob);

            return {
              ...item,
              processedBlob: blob,
              processedUrl,
              processedSize: blob.size,
              processedWidth: width,
              processedHeight: height,
              status: 'done' as const,
            };
          } catch (err: any) {
            return {
              ...item,
              status: 'error' as const,
              error: err.message || 'Crop failed',
            };
          }
        })
      );

      setImages(updated);
      setViewMode('slider');
      const totalSaved = updated.reduce(
        (acc, curr) => acc + (curr.originalSize - (curr.processedSize || curr.originalSize)),
        0
      );
      analytics.trackToolUsage('Batch Cropper', '/cropper', totalSaved);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-cropped.png`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}-cropped.png`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-cropped-images.zip');
    }
  };

  const completedCount = images.filter((i) => i.status === 'done').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SEOHead
        title={toolMeta.title}
        description={toolMeta.description}
        path={toolMeta.path}
      />

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
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 mb-3">
            <Crop className="w-3.5 h-3.5" /> High Precision Batch Cropper
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Free Online Image Cropper
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Crop multiple images simultaneously online with presets like 1:1, 16:9, 4:3, 9:16 or custom framing.
            Rotate, flip, compare with Before/After slider, and batch download all crops as a ZIP.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to crop in batch"
              description="Supports JPG, PNG, and WebP. Batch crop with exact aspect ratios and zero quality loss."
            />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              {activeImage && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  {/* Top Bar with File Name, View Mode Switcher, and Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {activeImage.originalName}
                      </h3>
                      <span className="text-xs text-slate-500">
                        Original: {formatFileSize(activeImage.originalSize)}
                        {activeImage.processedSize && (
                          <span className="text-emerald-600 font-semibold ml-2">
                            → Cropped: {formatFileSize(activeImage.processedSize)} ({activeImage.processedWidth} × {activeImage.processedHeight}px)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Mode Switcher */}
                      {activeImage.processedUrl && (
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setViewMode('crop')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              viewMode === 'crop'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Crop className="w-3.5 h-3.5 text-amber-600" />
                            <span>Crop Box</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('slider')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              viewMode === 'slider'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                            <span>Slider</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('side-by-side')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              viewMode === 'side-by-side'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Columns className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Side by Side</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={executeSingleCrop}
                        disabled={isProcessing}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>{isProcessing ? 'Cropping...' : 'Crop This'}</span>
                      </button>

                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={executeBatchCropAll}
                          disabled={isProcessing}
                          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Crop All ({images.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Content: Crop Frame vs Before/After Slider vs Side by Side */}
                  {isProcessing && (!activeImage.processedUrl || viewMode !== 'crop') ? (
                    <SkeletonPreview
                      mode={viewMode === 'crop' ? 'single' : viewMode}
                      statusText={`Cropping ${activeImage.originalName}...`}
                      subText={`Applying ${aspect.toUpperCase()} aspect crop, ${rotation}° rotation, and orientation in browser`}
                      heightClass="h-96"
                    />
                  ) : viewMode === 'slider' && activeImage.processedUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span className="font-semibold text-slate-700">
                          Interactive Before / After Comparison
                        </span>
                        <span>Drag handle horizontally to inspect crop alignment</span>
                      </div>
                      <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200">
                        <BeforeAfterSlider
                          originalUrl={activeImage.originalPreviewUrl}
                          processedUrl={activeImage.processedUrl}
                          originalLabel="Original"
                          processedLabel={`Cropped (${aspect.toUpperCase()})`}
                          className="h-full"
                        />
                      </div>
                    </div>
                  ) : viewMode === 'side-by-side' && activeImage.processedUrl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span>Original Image</span>
                          <span className="text-slate-500 font-normal">
                            {formatFileSize(activeImage.originalSize)}
                          </span>
                        </div>
                        <div className="h-80 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                          <img
                            src={activeImage.originalPreviewUrl}
                            alt="Original"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-700">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cropped Result
                          </span>
                          <span className="text-slate-500 font-normal">
                            {formatFileSize(activeImage.processedSize || 0)}
                          </span>
                        </div>
                        <div className="h-80 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                          <img
                            src={activeImage.processedUrl}
                            alt="Cropped Output"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Default Crop Canvas View */
                    <div
                      ref={containerRef}
                      className="relative h-96 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-4 select-none"
                    >
                      <img
                        src={activeImage.originalPreviewUrl}
                        alt="Crop target"
                        className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-200"
                        style={{
                          transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                        }}
                      />

                      {/* Aspect Frame Guidelines Overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none flex items-center justify-center">
                        <div
                          className="relative border-2 border-amber-400 rounded-lg shadow-2xl overflow-hidden bg-transparent pointer-events-auto"
                          style={{
                            width: `${Math.min(320, cropBox.width / 3.5)}px`,
                            height: `${Math.min(320, cropBox.height / 3.5)}px`,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                          }}
                        >
                          {/* Rule of Thirds Grid */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                            <div className="border-r border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div className="border-r border-b border-white"></div>
                            <div></div>
                          </div>

                          {/* Corner Markers */}
                          <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400"></div>
                          <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400"></div>
                          <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400"></div>
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400"></div>

                          {/* Center Aspect Ratio Tag */}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-amber-300 font-mono text-[10px] font-bold">
                            {aspect.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Notification When Cropped */}
                  {activeImage.processedUrl && viewMode === 'crop' && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={activeImage.processedUrl}
                          alt="Cropped thumbnail"
                          className="w-12 h-12 object-cover rounded-xl border border-amber-200 bg-white"
                        />
                        <div>
                          <span className="text-xs font-bold text-amber-900 block">
                            Cropped Output Generated!
                          </span>
                          <span className="text-xs text-amber-700">
                            {activeImage.processedWidth} × {activeImage.processedHeight} px •{' '}
                            {formatFileSize(activeImage.processedSize || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode('slider')}
                          className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Compare Slider
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(activeImage)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Processing Queue Interface */}
              <BatchQueueManager
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={(id) => {
                  setSelectedImageId(id);
                }}
                onRemoveImage={(id) => {
                  setImages((prev) => {
                    const filtered = prev.filter((i) => i.id !== id);
                    if (selectedImageId === id) setSelectedImageId(filtered[0]?.id || null);
                    return filtered;
                  });
                }}
                onClearAll={() => {
                  setImages([]);
                  setSelectedImageId(null);
                }}
                onDownloadSingle={handleDownloadSingle}
                onDownloadAllZip={handleDownloadAllZip}
                onAddFilesClick={() => fileInputRef.current?.click()}
                isProcessing={isProcessing}
                zipButtonText="Download All Cropped as ZIP"
              />
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-lg">
                    Aspect Ratio Presets
                  </h3>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {aspect.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Square (1:1)', val: '1:1' },
                    { label: 'Video (16:9)', val: '16:9' },
                    { label: 'Reel (9:16)', val: '9:16' },
                    { label: 'Photo (4:3)', val: '4:3' },
                    { label: 'Classic (3:2)', val: '3:2' },
                    { label: 'Freeform', val: 'free' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setAspect(p.val as AspectPreset)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        aspect === p.val
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-3">
                    Rotate &amp; Flip Transformation
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r - 90) % 360)}
                      className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                      title="Rotate 90° Counter-Clockwise"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlipH((f) => !f)}
                      className={`p-2.5 border rounded-xl flex items-center justify-center cursor-pointer ${
                        flipH
                          ? 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlipV((f) => !f)}
                      className={`p-2.5 border rounded-xl flex items-center justify-center cursor-pointer ${
                        flipV
                          ? 'bg-amber-100 border-amber-400 text-amber-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={executeSingleCrop}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Crop className="w-4 h-4" />
                    <span>Apply Crop (Current Image)</span>
                  </button>

                  <button
                    type="button"
                    onClick={executeBatchCropAll}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-[0.99]"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Cropping Batch Images...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-5 h-5" />
                        <span>Batch Crop All Images ({images.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Batch Information Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Batch Cropping Tip</span>
                  </div>
                  <p className="leading-relaxed">
                    "Batch Crop All" crops every image in your queue using your active preset ({aspect.toUpperCase()}) and transforms all images simultaneously. You can then download all cropped results in a single ZIP.
                  </p>
                </div>
              </div>

              <AdBanner type="sidebar" />
            </div>
          </div>
        )}

        <AdBanner type="bottom" />

        <FaqSection
          faqs={toolMeta.faqs}
          title="Image Cropping FAQs"
          subtitle="Learn how to crop photos with exact aspect ratios for social media and web."
        />
        <RelatedTools toolId={toolMeta.id} />
      </div>
    </div>
  );
}
