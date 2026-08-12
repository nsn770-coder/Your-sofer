'use client';
import { useState } from 'react';
import { uploadToCloudinary } from '@/app/lib/cloudinary';
import type { PartnerProduct } from '@/app/lib/partner-types';

const CATEGORIES = ['בד"ץ', 'סידור', 'טלית', 'כיפה', 'מזוזה', 'תפילין', 'ספרי קודש', 'אחר'];
const MAX_IMAGES = 5;

interface FormState {
  name: string;
  description: string;
  price: string;
  sku: string;
  stock: string;
  category: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  images: string[];
}

function toFormState(p?: PartnerProduct | null): FormState {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    price: p?.price != null ? String(p.price) : '',
    sku: p?.sku ?? '',
    stock: p?.stock != null ? String(p.stock) : '',
    category: p?.category ?? CATEGORIES[0],
    weight: p?.weight != null ? String(p.weight) : '',
    length: p?.dimensions?.length != null ? String(p.dimensions.length) : '',
    width: p?.dimensions?.width != null ? String(p.dimensions.width) : '',
    height: p?.dimensions?.height != null ? String(p.dimensions.height) : '',
    images: p?.images ?? [],
  };
}

export default function ProductFormModal({
  idToken,
  mode,
  initialData,
  warehouseType,
  onClose,
  onSaved,
}: {
  idToken: string;
  mode: 'create' | 'edit';
  initialData?: PartnerProduct | null;
  warehouseType: 'partner' | 'dropship' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(initialData));
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageSelect(index: number, file: File) {
    if (!file.type.startsWith('image/')) {
      setError('יש לבחור קובץ תמונה');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('הקובץ גדול מדי (מקסימום 10MB)');
      return;
    }

    setUploadingIndex(index);
    setError(null);
    try {
      const url = await uploadToCloudinary(file);
      setForm((f) => {
        const images = [...f.images];
        images[index] = url;
        return { ...f, images };
      });
    } catch (err) {
      setError('העלאת תמונה נכשלה');
      console.error(err);
    } finally {
      setUploadingIndex(null);
    }
  }

  function removeImage(index: number) {
    setForm((f) => {
      const images = [...f.images];
      images[index] = '';
      return { ...f, images: images.filter(Boolean) };
    });
  }

  function validate(): string | null {
    if (form.name.trim().length < 3 || form.name.trim().length > 200) {
      return 'שם המוצר חייב להיות בין 3 ל-200 תווים';
    }
    const price = Number(form.price);
    if (!price || price <= 0) return 'מחיר חייב להיות גדול מ-0';
    const stock = Number(form.stock);
    if (Number.isNaN(stock) || stock < 0) return 'מלאי חייב להיות 0 ומעלה';
    if (mode === 'create' && !form.sku.trim()) return 'SKU הוא שדה חובה';
    if (mode === 'create' && !warehouseType) {
      return 'יש להגדיר הגדרות מחסן לפני העלאת מוצר';
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const dimensions = {
        length: Number(form.length) || 0,
        width: Number(form.width) || 0,
        height: Number(form.height) || 0,
      };

      const url = mode === 'create'
        ? '/api/partner/products'
        : `/api/partner/products/${initialData!.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const body = mode === 'create'
        ? {
            name: form.name.trim(),
            description: form.description,
            price: Number(form.price),
            images: form.images.filter(Boolean),
            sku: form.sku.trim(),
            stock: Number(form.stock),
            category: form.category,
            weight: Number(form.weight) || 0,
            dimensions,
            warehouseType,
          }
        : {
            name: form.name.trim(),
            description: form.description,
            price: Number(form.price),
            images: form.images.filter(Boolean),
            stock: Number(form.stock),
            category: form.category,
            weight: Number(form.weight) || 0,
            dimensions,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שמירה נכשלה');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-xl font-bold">{mode === 'create' ? 'העלאת מוצר' : 'עריכת מוצר'}</h2>

        <Field label="שם המוצר" required value={form.name} onChange={(v) => update('name', v)} />
        <label className="block">
          <span className="text-sm font-medium text-gray-700">תיאור</span>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={3}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label="מחיר ₪" required type="number" value={form.price} onChange={(v) => update('price', v)} />
          <Field
            label="SKU"
            required={mode === 'create'}
            value={form.sku}
            onChange={(v) => update('sku', v)}
            disabled={mode === 'edit'}
          />
          <Field label="מלאי" required type="number" value={form.stock} onChange={(v) => update('stock', v)} />
          <label className="block">
            <span className="text-sm font-medium text-gray-700">קטגוריה</span>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field label="משקל (ק״ג)" type="number" value={form.weight} onChange={(v) => update('weight', v)} />
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">ממדים (ס״מ)</span>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <input
              type="number"
              placeholder="אורך"
              value={form.length}
              onChange={(e) => update('length', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="רוחב"
              value={form.width}
              onChange={(e) => update('width', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="גובה"
              value={form.height}
              onChange={(e) => update('height', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">תמונות</span>
          <p className="text-xs text-gray-500 mt-0.5">
            לחצו או גררו קובץ לכל משבצת · עד 10MB · התמונה הראשונה היא הראשית
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {Array.from({ length: MAX_IMAGES }).map((_, i) => (
              <div key={i} className="relative">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageSelect(i, file);
                  }}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden text-xs text-gray-400 hover:border-blue-400 hover:bg-gray-50 transition-colors"
                >
                  {form.images[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.images[i]} alt="" className="w-full h-full object-cover" />
                  ) : uploadingIndex === i ? (
                    'מעלה...'
                  ) : (
                    '+ תמונה'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(i, file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {form.images[i] && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-none"
                    aria-label="הסרת התמונה"
                  >
                    ×
                  </button>
                )}
                {i === 0 && form.images[0] && (
                  <span className="absolute bottom-0 right-0 left-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                    ראשית
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-white font-bold disabled:opacity-50"
            style={{ background: 'var(--ys-accent, #2563eb)' }}
          >
            {saving ? 'שומר...' : mode === 'create' ? 'העלה מוצר' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
      />
    </label>
  );
}
