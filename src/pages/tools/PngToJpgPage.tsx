import React, { useState, useEffect, useRef } from 'react';
import { Download, FileImage, Sliders, Columns, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { BatchQueueManager } from '../../components/common/BatchQueueManager';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import { convertPngToJpg, downloadZip, formatFileSize } from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'png-to-jpg')!;

export function PngToJpgPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [quality, setQuality] = useState<number>(90);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
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

  useEffect(() => {
    if (images.length === 0) return;

    let isMounted = true;
    setIsProcessing(true);

    const runConversion = async () => {
      const results = [...images];

      await Promise.all(
        images.map(async (item, idx) => {
          try {
            const { blob, width, height } = await convertPngToJpg(
              item.originalFile,
              quality,
              bgColor
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
              error: err.message || 'Conversion failed',
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

    runConversion();

    return () => {
      isMounted = false;
    };
  }, [quality, bgColor, images.map((i) => i.id).join(',')]);

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}.jpg`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}.jpg`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-png-to-jpg.zip');
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
        accept="image/png"
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-700 mb-3">
            <FileImage className="w-3.5 h-3.5" /> High Compression Ratio
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            PNG to JPG Converter
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Convert heavy PNG graphics into compact JPG images online. Choose background fill color,
            adjust JPEG quality, and reduce file weights by up to 85% for free.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes="image/png"
              title="Drop PNG images here to convert to JPG"
              description="Batch convert multiple PNGs to JPEG format in seconds."
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
                        <span className="font-semibold text-purple-600">PNG</span>
                        <span>({formatFileSize(activeImage.originalSize)})</span>
                        <span>→</span>
                        <span className="font-semibold text-cyan-600">JPG</span>
                        {activeImage.processedSize && (
                          <span className="font-bold text-emerald-600">
                            ({formatFileSize(activeImage.processedSize)})
                          </span>
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
                              ? 'bg-white text-cyan-700 shadow-xs'
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
                              ? 'bg-white text-cyan-700 shadow-xs'
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
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download JPG
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Converting ${activeImage.originalName} from PNG to JPG...`}
                        subText="In-browser Canvas 2D rasterization & JPEG quantization • Zero server uploads"
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                            <span>Updating JPG quality...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel={`PNG (${formatFileSize(activeImage.originalSize)})`}
                            processedLabel={`JPG (${formatFileSize(activeImage.processedSize || 0)})`}
                          />
                        ) : (
                          <div className="h-80 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-4">
                            <img
                              src={activeImage.processedUrl}
                              alt="Converted JPG"
                              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText="Initializing converter..."
                        subText="100% private in-browser PNG to JPG conversion"
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
                zipButtonText="Download All JPGs as ZIP"
              />
            </div>

            {/* Right: Settings */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-900 text-lg pb-3 border-b border-slate-100">
                  JPEG Settings
                </h3>

                {/* Quality Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-slate-700">JPEG Quality</label>
                    <span className="text-sm font-bold text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded-full">
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>

                {/* Background Fill for Transparency */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Background Color for Transparent Pixels
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBgColor('#FFFFFF')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                        bgColor === '#FFFFFF'
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span>
                      <span>White</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBgColor('#000000')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                        bgColor === '#000000'
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-black"></span>
                      <span>Black</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                      <span>Download Selected JPG</span>
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
          title="PNG to JPG Conversion FAQs"
          subtitle="Answers to common questions regarding converting PNG images to compact JPGs."
        />
      </div>
    </div>
  );
}
