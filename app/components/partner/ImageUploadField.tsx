'use client';

import { useRef, useState } from 'react';
import { uploadToCloudinary } from '@/app/lib/cloudinary';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Aspect ratio hint for the preview box, e.g. 'square' for a logo. */
  shape?: 'square' | 'wide';
  hint?: string;
  required?: boolean;
}

const MAX_MB = 10;

/**
 * Image field with drag-and-drop / file-picker upload to Cloudinary, matching the
 * flow used in the admin product editor. Falls back to pasting a URL directly.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  shape = 'wide',
  hint,
  required,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('יש לבחור קובץ תמונה');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`הקובץ גדול מדי (מקסימום ${MAX_MB}MB)`);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch {
      setError('העלאה נכשלה, נסו שוב');
    } finally {
      setUploading(false);
    }
  }

  const boxClass = shape === 'square' ? 'w-32 h-32' : 'w-full h-40';

  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`${boxClass} relative rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : value
            ? 'border-gray-200'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        {uploading ? (
          <span className="text-sm text-gray-500">מעלה...</span>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-contain bg-white" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs leading-none"
              aria-label="הסרת התמונה"
            >
              ×
            </button>
          </>
        ) : (
          <div className="text-center px-3">
            <div className="text-2xl">📷</div>
            <div className="text-sm text-gray-600 mt-1">לחצו או גררו תמונה לכאן</div>
            <div className="text-[11px] text-gray-400 mt-0.5">JPG / PNG / WEBP · עד {MAX_MB}MB</div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}

      <details className="mt-1">
        <summary className="text-xs text-gray-400 cursor-pointer">או הדבקת כתובת תמונה</summary>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://res.cloudinary.com/..."
          dir="ltr"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono"
        />
      </details>
    </div>
  );
}
