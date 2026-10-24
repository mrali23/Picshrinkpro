import React, { useState, useEffect, useRef } from 'react';
import { Download, Wand2, Sliders, RotateCcw, Columns, SlidersHorizontal, Sparkles, RefreshCw } from 'lucide-react';
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
  applyImageFilters,
  FilterSettings,
  DEFAULT_FILTER_SETTINGS,
  downloadZip,
  formatFileSize,
} from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';
import { analytics } from '../../utils/analytics';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'filters')!;

interface FilterPreset {
  name: string;
  badge?: string;
  settings: FilterSettings;
}

const PRESETS: FilterPreset[] = [
  {
    name: 'Normal',
    settings: { ...DEFAULT_FILTER_SETTINGS },
  },
  {
    name: 'B&W (Grayscale)',
    badge: 'Classic',
    settings: { ...DEFAULT_FILTER_SETTINGS, grayscale: 100, contrast: 115 },
  },
  {
    name: 'Vintage Sepia',
    badge: 'Retro',
    settings: { ...DEFAULT_FILTER_SETTINGS, sepia: 85, contrast: 95, brightness: 95 },
  },
  {
    name: 'Invert Neon',
    badge: 'Art',
    settings: { ...DEFAULT_FILTER_SETTINGS, invert: 100, contrast: 110 },
  },
  {
    name: 'Soft Dream',
    badge: 'Glow',
    settings: { ...DEFAULT_FILTER_SETTINGS, blur: 3, brightness: 110, saturate: 125 },
  },
  {
    name: 'High Contrast',
    settings: { ...DEFAULT_FILTER_SETTINGS, contrast: 150, saturate: 120 },
  },
  {
    name: 'Warm Sunset',
    settings: { ...DEFAULT_FILTER_SETTINGS, sepia: 35, saturate: 145, brightness: 105 },
  },
  {
    name: 'Cyberpunk',
    badge: 'Vibrant',
    settings: { ...DEFAULT_FILTER_SETTINGS, hueRotate: 190, contrast: 130, saturate: 160 },
  },
];

export function FiltersPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [filters, setFilters] = useState<FilterSettings>({ ...DEFAULT_FILTER_SETTINGS });
  const [activePreset, setActivePreset] = useState<string>('Normal');
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState<number>(92);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Re-run filter processing whenever filter settings or images change
  useEffect(() => {
    if (images.length === 0) return;

    let isMounted = true;
    setIsProcessing(true);

    const runFilters = async () => {
      const results = [...images];

      await Promise.all(
        images.map(async (item, idx) => {
          try {
            const { blob, width, height } = await applyImageFilters(
              item.originalFile,
              filters,
              exportFormat,
              quality
            );
            const processedUrl = URL.createObjectURL(blob);
            results[idx] = {
              ...item,
              processedBlob: blob,
              processedUrl,
              processedSize: blob.size,
              processedWidth: width,
              processedHeight: height,
              status: 'done' as const,
            };
            if (isMounted) {
              setImages([...results]);
            }
          } catch (err: any) {
            results[idx] = {
              ...item,
              status: 'error' as const,
              error: err.message || 'Filter failed',
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
        analytics.trackToolUsage('Image Filters', '/filters', 0);
      }
    };

    runFilters();

    return () => {
      isMounted = false;
    };
  }, [filters, exportFormat, quality, images.map((i) => i.id).join(',')]);

  const handleApplyPreset = (preset: FilterPreset) => {
    setActivePreset(preset.name);
    setFilters({ ...preset.settings });
  };

  const handleResetFilters = () => {
    setActivePreset('Normal');
    setFilters({ ...DEFAULT_FILTER_SETTINGS });
  };

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const ext = exportFormat === 'image/png' ? 'png' : exportFormat === 'image/webp' ? 'webp' : 'jpg';
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-filtered.${ext}`);
  };

  const handleDownloadAllZip = async () => {
    const ext = exportFormat === 'image/png' ? 'png' : exportFormat === 'image/webp' ? 'webp' : 'jpg';
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}-filtered.${ext}`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-filtered-images.zip');
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-3">
            <Wand2 className="w-3.5 h-3.5" /> 100% Canvas API Processing
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Free Online Photo Filters
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Apply grayscale, vintage sepia, color invert, blur, brightness, and contrast filters
            in real time. 100% private in-browser processing with single and batch ZIP downloads.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to apply photo filters"
              description="Batch apply grayscale, sepia, invert, and blur filters instantly."
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
                        <span>Original: {formatFileSize(activeImage.originalSize)}</span>
                        {activeImage.processedSize && (
                          <>
                            <span>→</span>
                            <span className="font-semibold text-emerald-600">
                              Filtered: {formatFileSize(activeImage.processedSize)}
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
                              ? 'bg-white text-blue-700 shadow-xs'
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
                              ? 'bg-white text-blue-700 shadow-xs'
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
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Filtered
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Interactive Before/After Comparison */}
                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Applying filter effects to ${activeImage.originalName}...`}
                        subText="In-browser Canvas 2D convolution & color matrix • Zero server uploads"
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            <span>Updating filters...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel="Original Photo"
                            processedLabel="Filtered Version"
                          />
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-slate-500">
                                Original ({formatFileSize(activeImage.originalSize)})
                              </div>
                              <div className="h-64 rounded-2xl bg-slate-100 flex items-center justify-center p-2">
                                <img
                                  src={activeImage.originalPreviewUrl}
                                  alt="Original"
                                  className="max-h-full max-w-full object-contain rounded-lg"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-blue-600 font-bold">
                                Filtered ({formatFileSize(activeImage.processedSize || 0)})
                              </div>
                              <div className="h-64 rounded-2xl bg-slate-100 flex items-center justify-center p-2">
                                <img
                                  src={activeImage.processedUrl}
                                  alt="Filtered output"
                                  className="max-h-full max-w-full object-contain rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText="Initializing photo filters..."
                        subText="100% private in-browser image editing"
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
                zipButtonText="Download All Filtered as ZIP"
              />
            </div>

            {/* Right: Controls & Presets */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-lg">Filter Presets</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Preset Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between ${
                        activePreset === preset.name
                          ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{preset.name}</span>
                      {preset.badge && (
                        <span className="text-[10px] text-amber-600 font-semibold mt-1">
                          {preset.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Individual Sliders */}
                <div className="pt-3 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Fine Adjustments
                  </h4>

                  {/* Grayscale */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Grayscale (B&amp;W)</span>
                      <span className="text-slate-500">{filters.grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.grayscale}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, grayscale: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Sepia */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Sepia Tone</span>
                      <span className="text-slate-500">{filters.sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.sepia}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, sepia: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>

                  {/* Invert */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Color Invert</span>
                      <span className="text-slate-500">{filters.invert}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.invert}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, invert: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  {/* Blur */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Soft Blur</span>
                      <span className="text-slate-500">{filters.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={filters.blur}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, blur: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Brightness</span>
                      <span className="text-slate-500">{filters.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={filters.brightness}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, brightness: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Contrast</span>
                      <span className="text-slate-500">{filters.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={filters.contrast}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, contrast: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Saturation</span>
                      <span className="text-slate-500">{filters.saturate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.saturate}
                      onChange={(e) => {
                        setActivePreset('Custom');
                        setFilters((prev) => ({ ...prev, saturate: Number(e.target.value) }));
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Export Format */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="image/jpeg">JPG (Standard Photo)</option>
                    <option value="image/png">PNG (Lossless Quality)</option>
                    <option value="image/webp">WebP (Next-Gen Compact)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Download All Filtered as ZIP ({images.length})</span>
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
          title="Photo Filters FAQs"
          subtitle="Learn how our client-side Canvas filter engine applies aesthetic filters in real time."
        />
      </div>
    </div>
  );
}
