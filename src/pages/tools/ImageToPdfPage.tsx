import { useState } from 'react';
import {
  Download,
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileCheck,
  Archive,
  Layers,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DropZone } from '../../components/common/DropZone';
import { AdBanner } from '../../components/common/AdBanner';
import { FaqSection } from '../../components/common/FaqSection';
import { SkeletonPreview } from '../../components/common/SkeletonPreview';
import { TOOLS_DATA } from '../../data/toolsData';
import { ProcessedImage } from '../../types';
import {
  generatePdfFromImages,
  formatFileSize,
  PdfOptions,
  downloadZip,
} from '../../utils/imageProcessors';
import { saveAs } from 'file-saver';
import { analytics } from '../../utils/analytics';

const toolMeta = TOOLS_DATA.find((t) => t.id === 'image-to-pdf')!;

export function ImageToPdfPage() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [orientation, setOrientation] = useState<'auto' | 'p' | 'l'>('auto');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [margin, setMargin] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

  const handleFilesSelected = (files: File[]) => {
    const newItems: ProcessedImage[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      originalFile: file,
      originalName: file.name,
      originalSize: file.size,
      originalPreviewUrl: URL.createObjectURL(file),
      status: 'idle',
    }));

    setImages((prev) => [...prev, ...newItems]);
    setGeneratedPdfBlob(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setGeneratedPdfBlob(null);
  };

  const removeItem = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setGeneratedPdfBlob(null);
  };

  const handleGenerateAndDownloadPdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      const files = images.map((i) => i.originalFile);
      const options: PdfOptions = {
        orientation,
        pageSize,
        margin,
      };

      const pdfBlob = await generatePdfFromImages(files, options);
      setGeneratedPdfBlob(pdfBlob);
      saveAs(pdfBlob, 'picshrink-document.pdf');
      analytics.trackToolUsage('Image to PDF', '/image-to-pdf', 0);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchDownloadIndividualPdfsZip = async () => {
    if (images.length === 0) return;
    setIsGeneratingBatch(true);

    try {
      const options: PdfOptions = {
        orientation,
        pageSize,
        margin,
      };

      const pdfItems = await Promise.all(
        images.map(async (img) => {
          const blob = await generatePdfFromImages([img.originalFile], options);
          const nameWithoutExt = img.originalName.replace(/\.[^/.]+$/, '');
          return {
            blob,
            filename: `${nameWithoutExt}.pdf`,
          };
        })
      );

      await downloadZip(pdfItems, 'picshrink-batch-pdfs.zip');
      analytics.trackToolUsage('Batch Image to PDF', '/image-to-pdf', 0);
    } catch (err) {
      console.error('Batch PDF generation error:', err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SEOHead
        title={toolMeta.title}
        description={toolMeta.description}
        path={toolMeta.path}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 mb-3">
            <FileText className="w-3.5 h-3.5" /> Multi-Page PDF Document
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Image to PDF Converter
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Convert JPG, PNG, and WebP images into a single clean PDF document online.
            Reorder pages, customize margins and paper sizes with 100% private in-browser generation.
          </p>
        </div>

        <AdBanner type="top" />

        {images.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              acceptedTypes={toolMeta.acceptedTypes}
              title="Drop images here to convert to PDF"
              description="Upload photos, receipts, or documents to merge into a single PDF file."
            />
          </div>
        ) : (
          <div className="my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Reorderable Grid of Pages */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-lg">
                    PDF Document Pages ({images.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setImages([])}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Clear All Pages
                  </button>
                </div>

                {isGenerating || isGeneratingBatch ? (
                  <div className="mt-6 space-y-4">
                    <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin shrink-0 text-red-600" />
                      <div className="text-xs">
                        <p className="font-bold">
                          {isGeneratingBatch ? 'Compiling Batch Individual PDFs...' : 'Compiling Multi-page PDF Document...'}
                        </p>
                        <p className="text-red-600/80">Rasterizing pages locally in browser memory without server uploads</p>
                      </div>
                    </div>
                    <SkeletonPreview
                      mode="grid"
                      statusText="Compiling PDF pages in browser..."
                      subText="Optimizing page layout and vector margins"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                    {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative bg-slate-50 rounded-2xl border border-slate-200 p-2.5 flex flex-col justify-between overflow-hidden shadow-xs hover:border-red-400 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveItem(index, 'up')}
                            className="p-1 rounded bg-white text-slate-700 disabled:opacity-30 hover:bg-slate-100 shadow-xs cursor-pointer"
                            title="Move Earlier"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === images.length - 1}
                            onClick={() => moveItem(index, 'down')}
                            className="p-1 rounded bg-white text-slate-700 disabled:opacity-30 hover:bg-slate-100 shadow-xs cursor-pointer"
                            title="Move Later"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(img.id)}
                            className="p-1 rounded bg-white text-rose-600 hover:bg-rose-50 shadow-xs cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="h-40 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={img.originalPreviewUrl}
                          alt={img.originalName}
                          className="max-h-full max-w-full object-contain rounded-md"
                        />
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500 truncate">
                        {img.originalName} ({formatFileSize(img.originalSize)})
                      </div>
                    </div>
                  ))}

                  <DropZone
                    compact
                    multiple
                    onFilesSelected={handleFilesSelected}
                    acceptedTypes={toolMeta.acceptedTypes}
                    className="h-full min-h-[160px] flex-col"
                  />
                </div>
                )}
              </div>
            </div>

            {/* Right: PDF Settings & Generate */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-900 text-lg pb-3 border-b border-slate-100">
                  Page Layout Settings
                </h3>

                {/* Page Orientation */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Page Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'auto', label: 'Auto' },
                      { id: 'p', label: 'Portrait' },
                      { id: 'l', label: 'Landscape' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setOrientation(item.id as any);
                          setGeneratedPdfBlob(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          orientation === item.id
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Size */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Paper Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'a4', label: 'A4' },
                      { id: 'letter', label: 'US Letter' },
                      { id: 'fit', label: 'Fit Image' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPageSize(item.id as any);
                          setGeneratedPdfBlob(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          pageSize === item.id
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Page Margins
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0, label: 'None' },
                      { val: 10, label: 'Small (10mm)' },
                      { val: 20, label: 'Big (20mm)' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setMargin(item.val);
                          setGeneratedPdfBlob(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          margin === item.val
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {generatedPdfBlob && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>PDF ready! File size: {formatFileSize(generatedPdfBlob.size)}</span>
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleGenerateAndDownloadPdf}
                    disabled={isGenerating || isGeneratingBatch || images.length === 0}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Merging into PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Convert &amp; Download PDF ({images.length} Pages)</span>
                      </>
                    )}
                  </button>

                  {images.length > 1 && (
                    <button
                      type="button"
                      onClick={handleBatchDownloadIndividualPdfsZip}
                      disabled={isGenerating || isGeneratingBatch || images.length === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isGeneratingBatch ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating Batch PDFs...</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4" />
                          <span>Batch Export Individual PDFs (ZIP)</span>
                        </>
                      )}
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
          title="Image to PDF FAQs"
          subtitle="Learn how to merge images into unified PDF files safely in your browser."
        />
      </div>
    </div>
  );
}
