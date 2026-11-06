import React, { useState, useEffect, useRef } from 'react';
import { Download, FileType2, Columns, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { BatchQueueManager } from '../../components/common/BatchQueueManager';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import { convertJpgToPng, downloadZip, formatFileSize } from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'jpg-to-png')!;

export function JpgToPngPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
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
            const { blob, width, height } = await convertJpgToPng(item.originalFile);
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
  }, [images.map((i) => i.id).join(',')]);

  const handleDownloadSingle = (item: ProcessedImage) => {
    if (!item.processedBlob) return;
    const nameWithoutExt = item.originalName.replace(/\.[^/.]+$/, '');
    saveAs(item.processedBlob, `${nameWithoutExt}.png`);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = images
      .filter((img) => img.processedBlob)
      .map((img) => {
        const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
        return {
          blob: img.processedBlob!,
          filename: `${nameWithoutExt}.png`,
        };
      });

    if (readyItems.length > 0) {
      await downloadZip(readyItems, 'picshrink-jpg-to-png.zip');
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
        accept="image/jpeg,image/jpg,.jpg,.jpeg,.jfif"
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 mb-3">
            <FileType2 className="w-3.5 h-3.5" /> PNG Output
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            JPG to PNG Converter
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Convert JPG images to PNG format in bulk. PNG stores the converted image using lossless encoding, but it cannot restore detail already lost in the original JPEG. Processing runs in your browser.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes="image/jpeg,image/jpg,.jpg,.jpeg,.jfif"
              title="Drop JPG images here to convert to PNG"
              description="Batch convert multiple JPGs to PNG format simultaneously."
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
                        <span className="font-semibold text-amber-600">JPG</span>
                        <span>({formatFileSize(activeImage.originalSize)})</span>
                        <span>→</span>
                        <span className="font-semibold text-purple-600">PNG</span>
                        {activeImage.processedSize && (
                          <span>({formatFileSize(activeImage.processedSize)})</span>
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
                              ? 'bg-white text-purple-700 shadow-xs'
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
                              ? 'bg-white text-purple-700 shadow-xs'
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
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PNG
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 relative">
                    {isProcessing && !activeImage.processedUrl ? (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText={`Converting ${activeImage.originalName} from JPG to PNG...`}
                        subText="In-browser Canvas lossless PNG encoding • Zero server uploads"
                        heightClass="h-72 sm:h-80"
                      />
                    ) : activeImage.processedUrl ? (
                      <div className="relative">
                        {isProcessing && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700">
                            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                            <span>Updating PNG conversion...</span>
                          </div>
                        )}
                        {viewMode === 'slider' ? (
                          <BeforeAfterSlider
                            originalUrl={activeImage.originalPreviewUrl}
                            processedUrl={activeImage.processedUrl}
                            originalLabel={`JPG (${formatFileSize(activeImage.originalSize)})`}
                            processedLabel={`PNG (${formatFileSize(activeImage.processedSize || 0)})`}
                          />
                        ) : (
                          <div className="h-80 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-4">
                            <img
                              src={activeImage.processedUrl}
                              alt="Converted PNG"
                              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <SkeletonPreview
                        mode={viewMode}
                        statusText="Initializing converter..."
                        subText="100% private in-browser JPG to PNG conversion"
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
                zipButtonText="Download All PNGs as ZIP"
              />
            </div>

            {/* Right: Actions */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-900 text-lg pb-3 border-b border-slate-100">
                  Export Options
                </h3>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/60 text-slate-800 text-xs leading-relaxed space-y-2">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <FileType2 className="w-4 h-4 text-purple-600" />
                    <span>Pure 24-bit PNG Format</span>
                  </div>
                  <p>
                    Your JPG photos are rendered to raw uncompressed bitmaps and exported to
                    lossless PNG with full alpha channel readiness.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    disabled={isProcessing || images.length === 0}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                      <span>Download Selected PNG</span>
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
          title="JPG to PNG Conversion FAQs"
          subtitle="Answers to common questions regarding converting JPG to PNG format."
        />
      </div>
    </div>
  );
}
