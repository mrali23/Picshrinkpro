import { useState, useEffect, useRef } from 'react';
import { Download, Sliders, RefreshCw, Sparkles, Columns, SlidersHorizontal } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { BatchQueueManager } from '../../components/common/BatchQueueManager';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import { compressImage, formatFileSize, downloadZip } from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';
import { analytics } from '../../utils/analytics';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'compressor')!;

export function CompressorPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [quality, setQuality] = useState<number>(80);
  const [maxWidth, setMaxWidth] = useState<number>(1920);
  const [applyResize, setApplyResize] = useState<boolean>(false);
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

  // Progressive batch compression whenever quality or settings change
  useEffect(() => {
    if (images.length === 0) return;

    let isMounted = true;
    setIsProcessing(true);

    const runCompression = async () => {
      const results = images.map((img) => ({
        ...img,
        status: (img.status === 'done' ? 'done' : 'processing') as ProcessedImage['status'],
      }));

      await Promise.all(
        images.map(async (item, idx) => {
          try {
            const { blob, width, height } = await compressImage(
              item.originalFile,
              quality,
              applyResize ? maxWidth : undefined
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
              error: err.message || 'Compression failed',
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
        const totalSaved = results.reduce(
          (acc, curr) => acc + (curr.originalSize - (curr.processedSize || curr.originalSize)),
          0
        );
        if (totalSaved > 0) {
          analytics.trackToolUsage('Image Compressor', '/compressor', totalSaved);
        }
      }
    };

    runCompression();

    return () => {
      isMounted = false;
    };
  }, [quality, maxWidth, applyResize, images.map((i) => i.id).join(',')]);

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const ext = item.originalFile.type === 'image/png' ? 'png' : 'jpg';
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}-compressed.${ext}`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const ext = img.originalFile.type === 'image/png' ? 'png' : 'jpg';
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}-compressed.${ext}`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-compressed-images.zip');
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  const handleClearAll = () => {
    setImages([]);
    setSelectedImageId(null);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 100% In-Browser Privacy
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Free Image Compressor
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Compress JPG, PNG, and WebP images in your browser. Adjust quality and optional dimensions to balance file size and visual detail; results vary by source image and format.
          </p>
        </div>

        {/* AdSense Top Placeholder */}
        <AdBanner type="top" />

        {/* Main Work Area */}
        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to compress"
              description="Batch upload supported. Works 100% locally on your computer or phone."
            />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left / Center: Interactive Preview & Before/After Slider */}
            <div className="lg:col-span-8 space-y-6">
              {/* Active Image Card */}
              {activeImage && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {activeImage.originalName}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Original: {formatFileSize(activeImage.originalSize)}</span>
                        {activeImage.processedSize && (
                          <>
                            <span>→</span>
                            <span className="font-semibold text-emerald-600">
                              Compressed: {formatFileSize(activeImage.processedSize)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Mode Switcher */}
                      <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode('slider')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            viewMode === 'slider'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Interactive Comparison Slider"
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
                          title="Side-by-side Comparison"
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Side-by-Side</span>
                        </button>
                      </div>

                      {activeImage.processedSize && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(activeImage)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Comparison Area */}
                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Compressing ${activeImage.originalName} at ${quality}% quality...`}
                        subText="In-browser processing • No image upload by this tool • Quality depends on format and settings"
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            <span>Updating compression ({quality}%)...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          /* Interactive Before/After Drag Slider */
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel={`Original (${formatFileSize(activeImage.originalSize)})`}
                            processedLabel={`Compressed (${formatFileSize(activeImage.processedSize || 0)})`}
                          />
                        ) : (
                          /* Side-by-side View */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                                <span>Original</span>
                                <span>{formatFileSize(activeImage.originalSize)}</span>
                              </div>
                              <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                                <img
                                  src={activeImage.originalPreviewUrl}
                                  alt="Original preview"
                                  className="max-h-full max-w-full object-contain rounded-lg"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                                <span>Compressed</span>
                                <span className="text-emerald-600 font-bold">
                                  {formatFileSize(activeImage.processedSize || 0)}
                                </span>
                              </div>
                              <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                                <img
                                  src={activeImage.processedUrl}
                                  alt="Compressed preview"
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
                        statusText="Preparing image..."
                        subText="Zero server uploads • 100% private in-browser WebAssembly"
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
                onRemoveImage={handleRemoveImage}
                onClearAll={handleClearAll}
                onDownloadSingle={handleDownloadSingle}
                onDownloadAllZip={handleDownloadAllZip}
                onAddFilesClick={() => fileInputRef.current?.click()}
                isProcessing={isProcessing}
                zipButtonText="Download All Compressed as ZIP"
              />
            </div>

            {/* Right: Controls & Actions */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-lg">Compression Settings</h3>
                  </div>
                </div>

                {/* Quality Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Compression Quality
                    </label>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      {quality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Smaller Size (10%)</span>
                    <span>Best Quality (100%)</span>
                  </div>
                </div>

                {/* Optional Max Resolution constraint */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={applyResize}
                      onChange={(e) => setApplyResize(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Limit Maximum Width
                    </span>
                  </label>

                  {applyResize && (
                    <div className="space-y-2">
                      <select
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      >
                        <option value={1920}>1920 px (Full HD - Recommended)</option>
                        <option value={1200}>1200 px (Standard Web Banner)</option>
                        <option value={800}>800 px (Blog Post Image)</option>
                        <option value={600}>600 px (Mobile / Thumbnail)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
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

              {/* Sidebar AdSense Placement */}
              <AdBanner type="sidebar" />
            </div>
          </div>
        )}

        {/* AdSense Bottom Placeholder */}
        <AdBanner type="bottom" />

        {/* FAQ with JSON-LD Schema */}
        <FaqSection
          faqs={toolMeta.faqs}
          title="Image Compression FAQs"
          subtitle="Understand image formats, compression quality, and local browser processing."
        />
      </div>
    </div>
  );
}
