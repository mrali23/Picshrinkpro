import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Plus } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string;
  multiple?: boolean;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function DropZone({
  onFilesSelected,
  acceptedTypes = 'image/jpeg,image/png,image/webp,image/gif',
  multiple = true,
  title = 'Drag & drop your images here',
  description = 'Supports JPG, PNG, WebP up to 50MB per file. 100% private in-browser.',
  className = '',
  compact = false,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|tiff|avif|heic|jfif)$/i.test(file.name)
      );
      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|tiff|avif|heic|jfif)$/i.test(file.name)
      );
      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
      e.target.value = ''; // reset for repeat selection
    }
  };

  // Support clipboard paste (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        onFilesSelected(multiple ? files : [files[0]]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [multiple, onFilesSelected]);

  if (compact) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50 text-slate-700'
        } ${className}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <Plus className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold">Add more images</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
        isDragOver
          ? 'border-blue-600 bg-blue-50/80 scale-[1.01] shadow-xl'
          : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/20 shadow-sm hover:shadow-md'
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Decorative upload icon container */}
      <div className="relative mb-5 flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
        <UploadCloud className="w-10 h-10 transition-transform group-hover:-translate-y-0.5" />
        <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow">
          <ImageIcon className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 text-center max-w-md mb-6">
        {description}
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
      >
        <UploadCloud className="w-5 h-5" />
        Select Images from Device
      </button>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span>Ctrl + V to paste</span>
        <span>•</span>
        <span>No file upload to servers</span>
        <span>•</span>
        <span>Unlimited free</span>
      </div>
    </div>
  );
}
