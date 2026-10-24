import React from 'react';
import {
  Archive,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProcessedImage } from '../../types';
import { formatFileSize } from '../../utils/imageProcessors';

interface BatchQueueManagerProps {
  images: ProcessedImage[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onClearAll: () => void;
  onDownloadSingle: (item: ProcessedImage) => void;
  onDownloadAllZip: () => void;
  onAddFilesClick: () => void;
  isProcessing?: boolean;
  zipButtonText?: string;
  className?: string;
}

export function BatchQueueManager({
  images,
  selectedImageId,
  onSelectImage,
  onRemoveImage,
  onClearAll,
  onDownloadSingle,
  onDownloadAllZip,
  onAddFilesClick,
  isProcessing = false,
  zipButtonText = 'Download All as ZIP',
  className = '',
}: BatchQueueManagerProps) {
  if (images.length === 0) return null;

  const totalFiles = images.length;
  const completedFiles = images.filter((img) => img.status === 'done').length;
  const errorFiles = images.filter((img) => img.status === 'error').length;
  const progressPercent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;

  // Aggregate sizes
  const totalOriginalSize = images.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalProcessedSize = images.reduce(
    (acc, curr) => acc + (curr.processedSize || curr.originalSize),
    0
  );
  const totalSavedBytes = Math.max(0, totalOriginalSize - totalProcessedSize);
  const totalSavingsPercent =
    totalOriginalSize > 0 ? Math.round((totalSavedBytes / totalOriginalSize) * 100) : 0;

  return (
    <div
      className={`bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6 ${className}`}
    >
      {/* Header & Overall Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <span>Batch Queue</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {completedFiles} of {totalFiles} processed ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddFilesClick}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add More</span>
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Clear Queue
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span className="text-blue-600">Processing batch files in browser...</span>
              </>
            ) : completedFiles === totalFiles ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">All images ready for download!</span>
              </>
            ) : (
              <span>Queue Status</span>
            )}
          </span>
          <span className="font-bold text-slate-800">{progressPercent}%</span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isProcessing
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 animate-pulse'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>

        {/* Savings pill if compression saved bytes */}
        {totalSavedBytes > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-600">
            <span>
              Total: {formatFileSize(totalOriginalSize)} → {formatFileSize(totalProcessedSize)}
            </span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Saved {formatFileSize(totalSavedBytes)} (-
              {totalSavingsPercent}%)
            </span>
          </div>
        )}
      </div>

      {/* Queue Items List */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {images.map((item, index) => {
          const isSelected = selectedImageId === item.id;
          const savings =
            item.processedSize && item.originalSize > item.processedSize
              ? Math.round(((item.originalSize - item.processedSize) / item.originalSize) * 100)
              : null;

          return (
            <div
              key={item.id}
              onClick={() => onSelectImage(item.id)}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-100 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  <img
                    src={item.processedUrl || item.originalPreviewUrl}
                    alt={item.originalName}
                    className="w-full h-full object-cover"
                  />
                  {(item.status === 'processing' || (isProcessing && !item.processedBlob)) && (
                    <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[0.5px] flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-xs">
                      {item.originalName}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-semibold">
                        Viewing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{formatFileSize(item.originalSize)}</span>
                    {item.processedSize ? (
                      <>
                        <span>→</span>
                        <span className="font-semibold text-slate-700">
                          {formatFileSize(item.processedSize)}
                        </span>
                        {savings && savings > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                            -{savings}%
                          </span>
                        )}
                      </>
                    ) : item.status === 'processing' || (isProcessing && !item.processedBlob) ? (
                      <div className="flex items-center gap-1.5 text-blue-600">
                        <span>→</span>
                        <span className="inline-block h-2.5 w-14 bg-blue-100 rounded animate-pulse" />
                        <span className="text-[10px] font-semibold text-blue-600 animate-pulse">
                          processing...
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {(item.status === 'processing' || (isProcessing && !item.processedBlob)) && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                    <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                    <span>Crunching</span>
                  </span>
                )}
                {item.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                {item.status === 'error' && (
                  <span title={item.error}>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </span>
                )}

                {item.processedBlob && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSingle(item);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-colors cursor-pointer"
                    title="Download this file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(item.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent ZIP Download Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onDownloadAllZip}
          disabled={completedFiles === 0 || isProcessing}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-[0.99]"
        >
          <Archive className="w-5 h-5" />
          <span>
            {zipButtonText} ({completedFiles} {completedFiles === 1 ? 'file' : 'files'})
          </span>
        </button>
      </div>
    </div>
  );
}
