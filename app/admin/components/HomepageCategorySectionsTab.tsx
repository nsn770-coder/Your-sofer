'use client';
// ─── HomepageCategorySectionsTab ──────────────────────────────────────────────
// Admin manager for the two homepage category sections:
//   🔝 top  — "קטגוריות נבחרות" (upper homepage)
//   📜 stam — "קטגוריות סת״ם" (lower homepage, under the soferim row)
//
// Capabilities: add any category OR sub-category (e.g. חגים ← ראש השנה),
// drag-and-drop ordering (+ arrows + direct position picker), per-item width
// (half row = 2 per row / full row), per-item image upload, rename, move
// between sections, live layout preview, restore defaults.

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CATEGORY_OPTIONS, parseCatValue } from '../../constants/categories';
import {
  SECTIONS_COLLECTION, SECTIONS_DOC, DEFAULT_SECTIONS, normalizeSections, buildCategoryHref,
} from '../../constants/homepageCategorySections';
import type {
  HomepageCategorySections, HomepageCategoryItem, SectionKey, ItemWidth,
} from '../../constants/homepageCategorySections';

// ─── Picker options: main categories, sub-categories, special pages ───────────

interface PickerOption {
  group: string;
  label: string;
  cat: string;
  subCategory?: string;
  href?: string;
  emoji?: string;
}

function buildPickerOptions(): PickerOption[] {
  const opts: PickerOption[] = [];
  for (const o of CATEGORY_OPTIONS) {
    if (o.type === 'standalone') {
      opts.push({ group: '📁 קטגוריות ראשיות', label: o.cat, cat: o.cat });
    } else {
      for (const child of o.children) {
        const { cat, subCategory } = parseCatValue(child.value);
        opts.push({
          group: `📂 ${o.label}`,
          label: child.label,
          cat,
          ...(subCategory ? { subCategory } : {}),
        });
      }
    }
  }
  opts.push(
    { group: '⭐ עמודים מיוחדים', label: 'שבתות וחגים',   cat: 'שבתות וחגים' },
    { group: '⭐ עמודים מיוחדים', label: 'סטים ומארזים',  cat: 'סטים ומארזים' },
    { group: '⭐ עמודים מיוחדים', label: 'חנוכה (עמוד)',   cat: 'חנוכה' },
    { group: '⭐ עמודים מיוחדים', label: 'פסח (עמוד)',     cat: 'פסח' },
    { group: '⭐ עמודים מיוחדים', label: 'נטלות וכלים',    cat: 'יודאיקה', subCategory: 'נטילת ידיים ומים אחרונים' },
    { group: '⭐ עמודים מיוחדים', label: 'כיפות לאירועים', cat: 'כיפות לאירועים', href: '/event-kippot', emoji: '🎩' },
    { group: '⭐ עמודים מיוחדים', label: 'כל המוצרים',     cat: 'הכל' },
  );
  return opts;
}

const PICKER_OPTIONS = buildPickerOptions();
const PICKER_GROUPS  = [...new Set(PICKER_OPTIONS.map(o => o.group))];

const SECTION_META: Record<SectionKey, { title: string; subtitle: string; accent: string }> = {
  top:  { title: '🔝 חלק עליון — "קטגוריות נבחרות"', subtitle: 'מוצג בראש דף הבית', accent: '#4F46E5' },
  stam: { title: '📜 חלק תחתון — "קטגוריות סת״ם"',  subtitle: 'מוצג מתחת לשורת הסופרים', accent: '#B45309' },
};

function newId() {
  return `hci-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Strips undefined fields so the object is Firestore-safe. */
function sanitizeItem(it: HomepageCategoryItem): HomepageCategoryItem {
  const out: HomepageCategoryItem = { id: it.id, label: it.label, cat: it.cat, width: it.width };
  if (it.subCategory) out.subCategory = it.subCategory;
  if (it.href)        out.href        = it.href;
  if (it.imageUrl)    out.imageUrl    = it.imageUrl;
  if (it.emoji)       out.emoji       = it.emoji;
  return out;
}

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', 'yoursofer_upload');
  const res  = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error('upload failed');
  return data.secure_url as string;
}

// ─── Single item row ──────────────────────────────────────────────────────────

function ItemRow({
  item, index, total, accent, catImages,
  onChange, onRemove, onMove, onMoveToOther, onDragStart, onDragOver, onDrop, dragging,
}: {
  item: HomepageCategoryItem;
  index: number;
  total: number;
  accent: string;
  catImages: Record<string, string>;
  onChange: (patch: Partial<HomepageCategoryItem>) => void;
  onRemove: () => void;
  onMove: (toIndex: number) => void;
  onMoveToOther: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const resolvedImg = item.imageUrl || catImages[item.subCategory ?? ''] || catImages[item.cat] || '';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange({ imageUrl: url });
    } catch { alert('שגיאה בהעלאת תמונה'); }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-3 bg-white border rounded-xl p-3 transition-shadow"
      style={{
        borderColor: dragging ? accent : '#E5E7EB',
        boxShadow: dragging ? `0 0 0 2px ${accent}33` : undefined,
        opacity: dragging ? 0.6 : 1,
        cursor: 'grab',
      }}
    >
      {/* Drag handle + position */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span title="גרור כדי לשנות סדר" className="text-gray-400 text-lg leading-none select-none">⠿</span>
        <select
          title="בחר מיקום"
          value={index}
          onChange={e => onMove(Number(e.target.value))}
          className="border border-gray-200 rounded-md text-xs font-bold px-1 py-0.5 bg-gray-50"
        >
          {Array.from({ length: total }).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
        </select>
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {resolvedImg
          ? <img src={resolvedImg} alt={item.label} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          : <span className="text-2xl">{item.emoji || '🖼️'}</span>}
      </div>

      {/* Label + cat badge */}
      <div className="flex-1 min-w-0">
        <input
          value={item.label}
          onChange={e => onChange({ label: e.target.value })}
          className="w-full border border-transparent hover:border-gray-200 focus:border-gray-300 rounded-lg px-2 py-1 text-sm font-bold outline-none"
        />
        <div className="flex items-center gap-1.5 mt-1 px-2 flex-wrap">
          <span className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-mono truncate">{item.cat}</span>
          {item.subCategory && (
            <span className="text-[11px] rounded-full px-2 py-0.5 font-mono truncate" style={{ background: `${accent}18`, color: accent }}>
              ← {item.subCategory}
            </span>
          )}
        </div>
      </div>

      {/* Width toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0" title="רוחב בפריסת דף הבית">
        {(['half', 'full'] as ItemWidth[]).map(w => (
          <button
            key={w}
            type="button"
            onClick={() => onChange({ width: w })}
            className="text-[11px] font-bold px-2.5 py-1.5 transition-colors"
            style={item.width === w
              ? { background: accent, color: '#fff' }
              : { background: '#F9FAFB', color: '#6B7280' }}
          >
            {w === 'half' ? '◧ חצי' : '⬛ שורה'}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button type="button" title="הזז למעלה" disabled={index === 0} onClick={() => onMove(index - 1)}
          className="w-7 h-7 rounded-md border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-30">▲</button>
        <button type="button" title="הזז למטה" disabled={index === total - 1} onClick={() => onMove(index + 1)}
          className="w-7 h-7 rounded-md border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-30">▼</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button type="button" title="העלה תמונה מותאמת" disabled={uploading} onClick={() => fileRef.current?.click()}
          className="w-7 h-7 rounded-md border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-40">
          {uploading ? '⏳' : '📷'}
        </button>
        <button type="button" title="העבר לחלק השני" onClick={onMoveToOther}
          className="w-7 h-7 rounded-md border border-gray-200 text-xs hover:bg-gray-50">⇅</button>
        <button type="button" title="הסר מהתצוגה" onClick={onRemove}
          className="w-7 h-7 rounded-md border border-red-100 text-xs text-red-500 hover:bg-red-50">🗑</button>
      </div>
    </div>
  );
}

// ─── Layout preview ───────────────────────────────────────────────────────────

function SectionPreview({ items, accent, catImages }: {
  items: HomepageCategoryItem[];
  accent: string;
  catImages: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3">
      {items.map(it => {
        const img = it.imageUrl || catImages[it.subCategory ?? ''] || catImages[it.cat] || '';
        return (
          <div
            key={it.id}
            className={it.width === 'full' ? 'col-span-2' : 'col-span-1'}
            style={{
              height: it.width === 'full' ? 44 : 56,
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              background: img ? `url(${img}) center/cover` : '#E5E7EB',
              border: `1px solid ${accent}44`,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.6)', padding: '0 6px', textAlign: 'center' }}>
                {it.emoji ? `${it.emoji} ` : ''}{it.label}{it.width === 'full' ? ' — שורה מלאה' : ''}
              </span>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="col-span-2 text-center text-xs text-gray-400 py-4">אין קטגוריות בחלק זה — הוסף מהרשימה למטה</div>
      )}
    </div>
  );
}

// ─── Section panel (list + add + preview) ─────────────────────────────────────

function SectionPanel({
  section, items, catImages, onItemsChange, onMoveToOther,
}: {
  section: SectionKey;
  items: HomepageCategoryItem[];
  catImages: Record<string, string>;
  onItemsChange: (items: HomepageCategoryItem[]) => void;
  onMoveToOther: (item: HomepageCategoryItem) => void;
}) {
  const meta = SECTION_META[section];
  const [pickerIdx, setPickerIdx] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onItemsChange(next);
  }

  function addFromPicker() {
    if (pickerIdx === '') return;
    const opt = PICKER_OPTIONS[Number(pickerIdx)];
    if (!opt) return;
    const exists = items.some(it => it.cat === opt.cat && (it.subCategory ?? '') === (opt.subCategory ?? ''));
    if (exists) { alert(`"${opt.label}" כבר מוצג בחלק זה`); return; }
    const item: HomepageCategoryItem = {
      id: newId(), label: opt.label, cat: opt.cat, width: 'half',
      ...(opt.subCategory ? { subCategory: opt.subCategory } : {}),
      ...(opt.href ? { href: opt.href } : {}),
      ...(opt.emoji ? { emoji: opt.emoji } : {}),
    };
    onItemsChange([...items, item]);
    setPickerIdx('');
  }

  function addCustom() {
    if (!customLabel.trim() || !customCat.trim()) { alert('יש למלא שם תצוגה וקטגוריה'); return; }
    onItemsChange([...items, { id: newId(), label: customLabel.trim(), cat: customCat.trim(), width: 'half' }]);
    setCustomLabel(''); setCustomCat(''); setShowCustom(false);
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${meta.accent}0D`, borderBottom: `2px solid ${meta.accent}` }}>
        <div>
          <h3 className="font-black text-sm" style={{ color: meta.accent }}>{meta.title}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{meta.subtitle} · {items.length} קטגוריות</p>
        </div>
        <button type="button" onClick={() => setShowPreview(v => !v)}
          className="text-[11px] font-bold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50">
          {showPreview ? '🙈 הסתר תצוגה מקדימה' : '👁️ תצוגה מקדימה'}
        </button>
      </div>

      <div className="p-4 grid gap-2">
        {/* Preview */}
        {showPreview && <SectionPreview items={items} accent={meta.accent} catImages={catImages} />}

        {/* Rows */}
        <div className="grid gap-2 mt-1">
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              item={it}
              index={i}
              total={items.length}
              accent={meta.accent}
              catImages={catImages}
              dragging={dragIdx === i}
              onChange={patch => onItemsChange(items.map(x => x.id === it.id ? { ...x, ...patch } : x))}
              onRemove={() => onItemsChange(items.filter(x => x.id !== it.id))}
              onMove={to => move(i, to)}
              onMoveToOther={() => onMoveToOther(it)}
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null) { move(dragIdx, i); setDragIdx(null); } }}
            />
          ))}
        </div>

        {/* Add from picker */}
        <div className="flex gap-2 items-center mt-2 bg-white border border-gray-200 rounded-xl p-2.5">
          <select
            value={pickerIdx}
            onChange={e => setPickerIdx(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white min-w-0"
          >
            <option value="">➕ בחר קטגוריה או תת-קטגוריה להוספה...</option>
            {PICKER_GROUPS.map(group => (
              <optgroup key={group} label={group}>
                {PICKER_OPTIONS.map((opt, idx) => opt.group === group
                  ? <option key={idx} value={idx}>{opt.label}{opt.subCategory ? ` (תת-קטגוריה של ${opt.cat})` : ''}</option>
                  : null)}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={addFromPicker} disabled={pickerIdx === ''}
            className="flex-shrink-0 text-white text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-40"
            style={{ background: meta.accent }}>
            הוסף
          </button>
          <button type="button" title="הוספה ידנית של קטגוריה חדשה" onClick={() => setShowCustom(v => !v)}
            className="flex-shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm hover:bg-gray-50">✏️</button>
        </div>

        {showCustom && (
          <div className="flex gap-2 items-center bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="שם תצוגה (למשל: ראש השנה)"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm min-w-0" />
            <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="ערך קטגוריה ב-Firestore"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono min-w-0" />
            <button type="button" onClick={addCustom}
              className="flex-shrink-0 bg-amber-600 text-white text-sm font-bold rounded-lg px-3 py-2">הוסף ידנית</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function HomepageCategorySectionsTab({ catImages }: { catImages: Record<string, string> }) {
  const [sections, setSections] = useState<HomepageCategorySections>(DEFAULT_SECTIONS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [dirty, setDirty]       = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, SECTIONS_COLLECTION, SECTIONS_DOC));
        if (snap.exists()) setSections(normalizeSections(snap.data()));
      } catch (e) { console.error('[HomepageCategorySections] load error:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  function update(section: SectionKey, items: HomepageCategoryItem[]) {
    setSections(prev => ({ ...prev, [section]: items }));
    setDirty(true);
    setSaved(false);
  }

  function moveToOther(from: SectionKey, item: HomepageCategoryItem) {
    const to: SectionKey = from === 'top' ? 'stam' : 'top';
    setSections(prev => ({
      ...prev,
      [from]: prev[from].filter(x => x.id !== item.id),
      [to]:   [...prev[to], item],
    }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, SECTIONS_COLLECTION, SECTIONS_DOC), {
        top:  sections.top.map(sanitizeItem),
        stam: sections.stam.map(sanitizeItem),
        updatedAt: Date.now(),
      });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    finally { setSaving(false); }
  }

  function restoreDefaults() {
    if (!confirm('לשחזר את שתי הרשימות לברירת המחדל המקורית של דף הבית?')) return;
    setSections({ top: [...DEFAULT_SECTIONS.top], stam: [...DEFAULT_SECTIONS.stam] });
    setDirty(true);
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">
        ⏳ טוען הגדרות תצוגת דף הבית...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black mb-1">🏠 תצוגת קטגוריות בדף הבית</h2>
          <p className="text-sm text-gray-500">
            בחר אילו קטגוריות (כולל תתי-קטגוריות, למשל <b>ראש השנה</b> מתוך <b>חגים</b>) יוצגו בכל חלק,
            גרור לשינוי סדר, וקבע לכל קטגוריה רוחב — <b>◧ חצי</b> (2 בשורה) או <b>⬛ שורה מלאה</b>.
          </p>
        </div>
        <button type="button" onClick={restoreDefaults}
          className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          ♻️ שחזר ברירת מחדל
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionPanel section="top"  items={sections.top}  catImages={catImages}
          onItemsChange={items => update('top', items)}  onMoveToOther={it => moveToOther('top', it)} />
        <SectionPanel section="stam" items={sections.stam} catImages={catImages}
          onItemsChange={items => update('stam', items)} onMoveToOther={it => moveToOther('stam', it)} />
      </div>

      {/* Save bar */}
      <div className="sticky bottom-3 mt-5 flex items-center gap-4 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
        <button onClick={save} disabled={saving}
          className="bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50">
          {saving ? '⏳ שומר...' : '💾 שמור תצוגת דף הבית'}
        </button>
        {saved && <span className="text-green-600 font-bold text-sm">✅ נשמר! השינויים יופיעו בדף הבית</span>}
        {dirty && !saved && <span className="text-amber-600 font-bold text-sm">⚠️ יש שינויים שלא נשמרו</span>}
        <span className="text-[11px] text-gray-400 mr-auto hidden md:block">
          קישור לדוגמה: {buildCategoryHref({ cat: 'חגים', subCategory: 'ראש השנה' })}
        </span>
      </div>
    </div>
  );
}
