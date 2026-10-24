import React, { useState, useEffect, useRef } from 'react';
import { Download, Maximize2, Lock, Unlock, Sliders, Columns, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { BatchQueueManager } from '../../components/common/BatchQueueManager';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import { resizeImage, getImageDimensions, formatFileSize, downloadZip } from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'resizer')!;

export function ResizerPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [mode, setMode] = useState<'pixels' | 'percentage'>('pixels');
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(800);
  const [percentage, setPercentage] = useState<number>(50);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1.5);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: File[]) => {
    const newItems: ProcessedImage[] = await Promise.all(
      files.map(async (file) => {
        const dims = await getImageDimensions(file).catch(() => ({ width: 1200, height: 800 }));
        return {
          id: Math.random().toString(36).substring(2, 9),
          originalFile: file,
          originalName: file.name,
          originalSize: file.size,
          originalWidth: dims.width,
          originalHeight: dims.height,
          originalPreviewUrl: URL.createObjectURL(file),
          status: 'idle',
        };
      })
    );

    setImages((prev) => {
      const combined = [...prev, ...newItems];
      if (!selectedImageId && combined.length > 0) {
        setSelectedImageId(combined[0].id);
        if (combined[0].originalWidth && combined[0].originalHeight) {
          setWidth(combined[0].originalWidth);
          setHeight(combined[0].originalHeight);
          setAspectRatio(combined[0].originalWidth / combined[0].originalHeight);
        }
      }
      return combined;
    });
  };

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockAspect && aspectRatio > 0) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockAspect && aspectRatio > 0) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  useEffect(() => {
    if (images.length === 0) return;

    let isMounted = true;
    setIsProcessing(true);

    const runResize = async () => {
      const results = [...images];

      await Promise.all(
        images.map(async (item, idx) => {
          try {
            let targetW = width;
            let targetH = height;

            if (mode === 'percentage') {
              const baseW = item.originalWidth || 1000;
              const baseH = item.originalHeight || 800;
              targetW = Math.round((baseW * percentage) / 100);
              targetH = Math.round((baseH * percentage) / 100);
            }

            const { blob, width: resW, height: resH } = await resizeImage(
              item.originalFile,
              targetW,
              targetH,
              quality,
              format
            );
            const processedUrl = URL.createObjectURL(blob);
            results[idx] = {
              ...item,
              processedBlob: blob,
              processedUrl,
              processedSize: blob.size,
              processedWidth: resW,
              processedHeight: resH,
              status: 'done' as const,
            };
            if (isMounted) {
              setImages([...results]);
            }
          } catch (err: any) {
            results[idx] = {
              ...item,
              status: 'error' as const,
              error: err.message || 'Resize failed',
            };
            if (isMounted) {
              setImages([...results]);
            }
          }
        })
      );

      if (isMounted) {
        setImages(results);
        setIsProcessing(false);
      }
    };

    runResize();

    return () => {
      isMounted = false;
    };
  }, [mode, width, height, percentage, format, quality, images.map((i) => i.id).join(',')]);

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-${item.processedWidth}x${item.processedHeight}.${ext}`);
  };

  const handleDownloadAllZip = async () => {
    const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}-${img.processedWidth}x${img.processedHeight}.${ext}`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-resized-images.zip');
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 mb-3">
            <Maximize2 className="w-3.5 h-3.5" /> Pixel &amp; Percentage Scaling
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Free Image Resizer
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Resize photos by exact pixel dimensions or percentage scale. Lock aspect ratios,
            optimize resolution for social media, and batch export in seconds.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to resize"
              description="Batch scale multiple photos by pixels or percentage simultaneously."
            />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              {activeImage && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {activeImage.originalName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>
                          Original: {activeImage.originalWidth}x{activeImage.originalHeight}px
                        </span>
                        {activeImage.processedWidth && (
                          <>
                            <span>→</span>
                            <span className="font-bold text-emerald-600">
                              Resized: {activeImage.processedWidth}x{activeImage.processedHeight}px
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode('slider')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            viewMode === 'slider'
                              ? 'bg-white text-emerald-700 shadow-xs'
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
                              ? 'bg-white text-emerald-700 shadow-xs'
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
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Resizing ${activeImage.originalName}...`}
                        subText={`Target size: ${mode === 'pixels' ? `${width}x${height}px` : `${percentage}%`} • In-browser Canvas bicubic interpolation`}
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                            <span>Updating resize dimensions...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel={`Original (${activeImage.originalWidth}x${activeImage.originalHeight})`}
                            processedLabel={`Resized (${activeImage.processedWidth}x${activeImage.processedHeight})`}
                          />
                        ) : (
                          <div className="h-80 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-4">
                            <img
                              src={activeImage.processedUrl}
                              alt="Resized output"
                              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText="Initializing resizer..."
                        subText="100% private in-browser image scaling"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Batch Processing Queue Interface */}
              <BatchQueueManager
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={(id) => setSelectedImageId(id)}
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
                zipButtonText="Download All Resized as ZIP"
              />
            </div>

            {/* Right: Resize Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Resize Options</h3>
                  </div>
                </div>

                {/* Mode Tabs: By Pixels vs By Percentage */}
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('pixels')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'pixels'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Pixels
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('percentage')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'percentage'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Percentage
                  </button>
                </div>

                {mode === 'pixels' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => handleWidthChange(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => handleHeightChange(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLockAspect(!lockAspect)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
                    >
                      {lockAspect ? (
                        <Lock className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Unlock className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Maintain Aspect Ratio ({lockAspect ? 'Locked' : 'Unlocked'})</span>
                    </button>

                    {/* Quick Presets */}
                    <div className="pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Common Social Presets
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setLockAspect(false);
                            setWidth(1080);
                            setHeight(1080);
                          }}
                          className="p-2 border border-slate-200 rounded-xl text-left hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                        >
                          <strong className="block text-slate-800">1080 × 1080</strong>
                          <span className="text-[10px] text-slate-400">Instagram Square</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLockAspect(false);
                            setWidth(1080);
                            setHeight(1920);
                          }}
                          className="p-2 border border-slate-200 rounded-xl text-left hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                        >
                          <strong className="block text-slate-800">1080 × 1920</strong>
                          <span className="text-[10px] text-slate-400">Story / Reels</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLockAspect(false);
                            setWidth(1280);
                            setHeight(720);
                          }}
                          className="p-2 border border-slate-200 rounded-xl text-left hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                        >
                          <strong className="block text-slate-800">1280 × 720</strong>
                          <span className="text-[10px] text-slate-400">YouTube Thumbnail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLockAspect(false);
                            setWidth(1200);
                            setHeight(630);
                          }}
                          className="p-2 border border-slate-200 rounded-xl text-left hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                        >
                          <strong className="block text-slate-800">1200 × 630</strong>
                          <span className="text-[10px] text-slate-400">Facebook / OG</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-700">Scaling Factor</span>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        {percentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={percentage}
                      onChange={(e) => setPercentage(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPercentage(pct)}
                          className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                            percentage === pct
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Format and Quality */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Export Format
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50"
                    >
                      <option value="image/jpeg">JPG / JPEG (Standard)</option>
                      <option value="image/png">PNG (Lossless High Detail)</option>
                      <option value="image/webp">WebP (Next-Gen Compact)</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                      <span>Download Selected Photo</span>
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
          title="Image Resizing FAQs"
          subtitle="Everything you need to know about resizing images by pixels and percentages."
        />
      </div>
    </div>
  );
}
