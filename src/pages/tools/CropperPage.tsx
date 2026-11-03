import { useState, useRef, useEffect, useCallback } from 'react';
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

type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export function CropperPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectPreset>('1:1');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0, y: 0, width: 400, height: 400,
  });
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'crop' | 'slider' | 'side-by-side'>('crop');
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [displayRect, setDisplayRect] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0, top: 0, width: 0, height: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragMode = useRef<DragMode>(null);
  const dragStart = useRef<{ x: number; y: number; box: typeof cropBox } | null>(null);

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
      if (!selectedImageId && combined.length > 0) setSelectedImageId(combined[0].id);
      return combined;
    });
  };

  const measureDisplay = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const iRect = imgRef.current.getBoundingClientRect();
    setDisplayRect({
      left: iRect.left - cRect.left,
      top: iRect.top - cRect.top,
      width: iRect.width,
      height: iRect.height,
    });
  }, []);

  useEffect(() => {
    if (!activeImage) return;
    loadImage(activeImage.originalFile).then((img) => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      setImgNatural({ w: imgW, h: imgH });
      const crop = calculateAspectRatioCrop(imgW, imgH, aspect);
      setCropBox(crop);
      requestAnimationFrame(() => requestAnimationFrame(measureDisplay));
    });
  }, [activeImage?.id, aspect, measureDisplay]);

  useEffect(() => {
    const onResize = () => measureDisplay();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureDisplay]);

  const toDisplayBox = () => {
    if (!imgNatural.w || !displayRect.width) return { left: 0, top: 0, width: 100, height: 100 };
    const scaleX = displayRect.width / imgNatural.w;
    const scaleY = displayRect.height / imgNatural.h;
    return {
      left: displayRect.left + cropBox.x * scaleX,
      top: displayRect.top + cropBox.y * scaleY,
      width: cropBox.width * scaleX,
      height: cropBox.height * scaleY,
    };
  };
  const displayBox = toDisplayBox();

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragMode.current = mode;
    dragStart.current = { x: e.clientX, y: e.clientY, box: { ...cropBox } };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragMode.current || !dragStart.current || !imgNatural.w || !displayRect.width) return;
    const scaleX = imgNatural.w / displayRect.width;
    const scaleY = imgNatural.h / displayRect.height;
    const dx = (e.clientX - dragStart.current.x) * scaleX;
    const dy = (e.clientY - dragStart.current.y) * scaleY;
    let { x, y, width, height } = dragStart.current.box;
    const mode = dragMode.current;
    const minSize = 20;

    if (mode === 'move') {
      x = Math.max(0, Math.min(imgNatural.w - width, x + dx));
      y = Math.max(0, Math.min(imgNatural.h - height, y + dy));
    } else {
      if (mode.includes('e')) width = Math.max(minSize, Math.min(imgNatural.w - x, width + dx));
      if (mode.includes('s')) height = Math.max(minSize, Math.min(imgNatural.h - y, height + dy));
      if (mode.includes('w')) {
        const newW = Math.max(minSize, width - dx);
        const newX = x + (width - newW);
        if (newX >= 0) { x = newX; width = newW; }
      }
      if (mode.includes('n')) {
        const newH = Math.max(minSize, height - dy);
        const newY = y + (height - newH);
        if (newY >= 0) { y = newY; height = newH; }
      }
      if (aspect !== 'free') {
        let ratio = 1;
        if (aspect === '16:9') ratio = 16 / 9;
        else if (aspect === '9:16') ratio = 9 / 16;
        else if (aspect === '4:3') ratio = 4 / 3;
        else if (aspect === '3:2') ratio = 3 / 2;
        if (mode === 'e' || mode === 'w') {
          height = width / ratio;
          if (y + height > imgNatural.h) { height = imgNatural.h - y; width = height * ratio; }
        } else if (mode === 'n' || mode === 's') {
          width = height * ratio;
          if (x + width > imgNatural.w) { width = imgNatural.w - x; height = width / ratio; }
        } else {
          height = width / ratio;
          if (y + height > imgNatural.h) { height = imgNatural.h - y; width = height * ratio; }
        }
      }
    }
    setCropBox({
      x: Math.round(Math.max(0, x)),
      y: Math.round(Math.max(0, y)),
      width: Math.round(Math.max(minSize, width)),
      height: Math.round(Math.max(minSize, height)),
    });
  };

  const onPointerUp = () => { dragMode.current = null; dragStart.current = null; };

  const executeSingleCrop = async () => {
    if (!activeImage) return;
    setIsProcessing(true);
    try {
      const { blob, width, height } = await cropImage(activeImage.originalFile, { ...cropBox, rotation, flipH, flipV }, 'image/png');
      const processedUrl = URL.createObjectURL(blob);
      setImages((prev) => prev.map((img) => img.id === activeImage.id ? { ...img, processedBlob: blob, processedUrl, processedSize: blob.size, processedWidth: width, processedHeight: height, status: 'done' } : img));
      setViewMode('slider');
      analytics.trackToolUsage('Image Cropper', '/cropper', Math.max(0, activeImage.originalSize - blob.size));
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const executeBatchCropAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const updated = await Promise.all(images.map(async (item) => {
        try {
          const dims = item.originalWidth && item.originalHeight ? { width: item.originalWidth, height: item.originalHeight } : await getImageDimensions(item.originalFile);
          const crop = calculateAspectRatioCrop(dims.width, dims.height, aspect);
          const { blob, width, height } = await cropImage(item.originalFile, { ...crop, rotation, flipH, flipV }, 'image/png');
          const processedUrl = URL.createObjectURL(blob);
          return { ...item, processedBlob: blob, processedUrl, processedSize: blob.size, processedWidth: width, processedHeight: height, status: 'done' as const };
        } catch (err: any) {
          return { ...item, status: 'error' as const, error: err.message || 'Crop failed' };
        }
      }));
      setImages(updated);
      setViewMode('slider');
      const totalSaved = updated.reduce((acc, curr) => acc + (curr.originalSize - (curr.processedSize || curr.originalSize)), 0);
      analytics.trackToolUsage('Batch Cropper', '/cropper', totalSaved);
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-cropped.png`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images.filter((img) => img.processedBlob).map((img) => {
      const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
      return { blob: img.processedBlob!, filename: `${nameWithoutExt}-cropped.png` };
    });
    if (readyItems.length > 0) await downloadZip(readyItems, 'picshrink-cropped-images.zip');
  };

  const handleStyle: React.CSSProperties = {
    width: 12, height: 12, background: '#f59e0b', border: '2px solid white', borderRadius: 2, position: 'absolute', zIndex: 30,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SEOHead title={toolMeta.title} description={toolMeta.description} path={toolMeta.path} />
      <input ref={fileInputRef} type="file" multiple accept={toolMeta.acceptedTypes} onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleFilesSelected(Array.from(e.target.files)); e.target.value = ''; } }} className="hidden" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 mb-3">
            <Crop className="w-3.5 h-3.5" /> High Precision Batch Cropper
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Free Online Image Cropper</h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Crop multiple images with presets (1:1, 16:9, 4:3, 9:16) or freeform. Drag and resize the crop box, rotate, flip, then download individually or as a ZIP.
          </p>
        </div>
        <AdBanner type="top" />
        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone onFilesSelected={handleFilesSelected} acceptedTypes={toolMeta.acceptedTypes} title="Drop images here to crop in batch" description="Supports JPG, PNG, and WebP. Interactive drag-and-resize crop box with exact aspect ratios." />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              {activeImage && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{activeImage.originalName}</h3>
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
                      {activeImage.processedUrl && (
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                          <button type="button" onClick={() => setViewMode('crop')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'crop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                            <Crop className="w-3.5 h-3.5 text-amber-600" /><span>Crop Box</span>
                          </button>
                          <button type="button" onClick={() => setViewMode('slider')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'slider' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" /><span>Slider</span>
                          </button>
                          <button type="button" onClick={() => setViewMode('side-by-side')} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === 'side-by-side' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                            <Columns className="w-3.5 h-3.5 text-indigo-600" /><span>Side by Side</span>
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={executeSingleCrop} disabled={isProcessing} className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
                        <Crop className="w-3.5 h-3.5" /><span>{isProcessing ? 'Cropping...' : 'Crop This'}</span>
                      </button>
                      {images.length > 1 && (
                        <button type="button" onClick={executeBatchCropAll} disabled={isProcessing} className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer">
                          <Layers className="w-3.5 h-3.5" /><span>Crop All ({images.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isProcessing && (!activeImage.processedUrl || viewMode !== 'crop') ? (
                    <SkeletonPreview mode={viewMode === 'crop' ? 'single' : viewMode} statusText={`Cropping ${activeImage.originalName}...`} subText={`Applying ${aspect.toUpperCase()} aspect crop, ${rotation}° rotation`} heightClass="h-96" />
                  ) : viewMode === 'slider' && activeImage.processedUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span className="font-semibold text-slate-700">Interactive Before / After Comparison</span>
                        <span>Drag handle to inspect crop</span>
                      </div>
                      <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200">
                        <BeforeAfterSlider originalUrl={activeImage.originalPreviewUrl} processedUrl={activeImage.processedUrl} originalLabel="Original" processedLabel={`Cropped (${aspect.toUpperCase()})`} className="h-full" />
                      </div>
                    </div>
                  ) : viewMode === 'side-by-side' && activeImage.processedUrl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700"><span>Original Image</span><span className="text-slate-500 font-normal">{formatFileSize(activeImage.originalSize)}</span></div>
                        <div className="h-80 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                          <img src={activeImage.originalPreviewUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-700"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Cropped Result</span><span className="text-slate-500 font-normal">{formatFileSize(activeImage.processedSize || 0)}</span></div>
                        <div className="h-80 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                          <img src={activeImage.processedUrl} alt="Cropped Output" className="max-h-full max-w-full object-contain" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div ref={containerRef} className="relative h-96 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden p-4 select-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                      <img ref={imgRef} src={activeImage.originalPreviewUrl} alt="Crop target" onLoad={measureDisplay} className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-200" style={{ transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }} />
                      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.55)' }} />
                      <div className="absolute border-2 border-amber-400 bg-transparent" style={{ left: displayBox.left, top: displayBox.top, width: displayBox.width, height: displayBox.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', cursor: 'move' }} onPointerDown={onPointerDown('move')}>
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">{[...Array(9)].map((_, i) => (<div key={i} className="border border-white/20" />))}</div>
                        <div style={{ ...handleStyle, top: -6, left: -6, cursor: 'nw-resize' }} onPointerDown={onPointerDown('nw')} />
                        <div style={{ ...handleStyle, top: -6, right: -6, left: 'auto', cursor: 'ne-resize' }} onPointerDown={onPointerDown('ne')} />
                        <div style={{ ...handleStyle, bottom: -6, left: -6, top: 'auto', cursor: 'sw-resize' }} onPointerDown={onPointerDown('sw')} />
                        <div style={{ ...handleStyle, bottom: -6, right: -6, top: 'auto', left: 'auto', cursor: 'se-resize' }} onPointerDown={onPointerDown('se')} />
                        <div style={{ ...handleStyle, top: -6, left: '50%', marginLeft: -6, cursor: 'n-resize' }} onPointerDown={onPointerDown('n')} />
                        <div style={{ ...handleStyle, bottom: -6, left: '50%', marginLeft: -6, top: 'auto', cursor: 's-resize' }} onPointerDown={onPointerDown('s')} />
                        <div style={{ ...handleStyle, left: -6, top: '50%', marginTop: -6, cursor: 'w-resize' }} onPointerDown={onPointerDown('w')} />
                        <div style={{ ...handleStyle, right: -6, top: '50%', marginTop: -6, left: 'auto', cursor: 'e-resize' }} onPointerDown={onPointerDown('e')} />
                      </div>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 text-[10px] text-white font-medium pointer-events-none">
                        Drag box to move • Drag corners/edges to resize • {Math.round(cropBox.width)}×{Math.round(cropBox.height)}px
                      </div>
                    </div>
                  )}
                </div>
              )}
              <BatchQueueManager images={images} selectedImageId={selectedImageId} onSelectImage={(id) => setSelectedImageId(id)} onRemoveImage={(id) => { setImages((prev) => { const filtered = prev.filter((i) => i.id !== id); if (selectedImageId === id) setSelectedImageId(filtered[0]?.id || null); return filtered; }); }} onClearAll={() => { setImages([]); setSelectedImageId(null); }} onDownloadSingle={handleDownloadSingle} onDownloadAllZip={handleDownloadAllZip} onAddFilesClick={() => fileInputRef.current?.click()} isProcessing={isProcessing} zipButtonText="Download All Cropped as ZIP" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-lg">Aspect Ratio Presets</h3>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{aspect.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Square (1:1)', val: '1:1' }, { label: 'Video (16:9)', val: '16:9' }, { label: 'Reel (9:16)', val: '9:16' }, { label: 'Photo (4:3)', val: '4:3' }, { label: 'Classic (3:2)', val: '3:2' }, { label: 'Freeform', val: 'free' }].map((p) => (
                    <button key={p.val} type="button" onClick={() => setAspect(p.val as AspectPreset)} className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${aspect === p.val ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'}`}>{p.label}</button>
                  ))}
                </div>
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm">Transform</h4>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> -90°</button>
                    <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"><RotateCw className="w-3.5 h-3.5" /> +90°</button>
                    <button type="button" onClick={() => setFlipH((v) => !v)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${flipH ? 'bg-amber-100 border-amber-300' : 'border-slate-200 hover:bg-slate-50'}`}><FlipHorizontal className="w-3.5 h-3.5" /> Flip H</button>
                    <button type="button" onClick={() => setFlipV((v) => !v)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${flipV ? 'bg-amber-100 border-amber-300' : 'border-slate-200 hover:bg-slate-50'}`}><FlipVertical className="w-3.5 h-3.5" /> Flip V</button>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <button type="button" onClick={executeSingleCrop} disabled={isProcessing || !activeImage} className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Crop className="w-4 h-4" /><span>Apply Crop (Current Image)</span>
                  </button>
                  <button type="button" onClick={executeBatchCropAll} disabled={isProcessing || images.length === 0} className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-[0.99]">
                    {isProcessing ? (<><RefreshCw className="w-5 h-5 animate-spin" /><span>Cropping Batch Images...</span></>) : (<><Layers className="w-5 h-5" /><span>Batch Crop All Images ({images.length})</span></>)}
                  </button>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-600" /><span>Interactive Crop Tip</span></div>
                  <p className="leading-relaxed">Drag the amber box to reposition. Drag any corner or edge handle to resize. Aspect ratio stays locked unless you choose Freeform. Then hit Apply Crop or Batch Crop All.</p>
                </div>
              </div>
              <AdBanner type="sidebar" />
            </div>
          </div>
        )}
        <AdBanner type="bottom" />
        <FaqSection faqs={toolMeta.faqs} title="Image Cropping FAQs" subtitle="Learn how to crop photos with exact aspect ratios for social media and web." />
      </div>
    </div>
  );
}
