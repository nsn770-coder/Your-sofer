'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/app/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_THEME, type ThemeConfig } from './theme.config';

// ──────────────────────────────────────────
// קומפוננטות עזר לפאנל
// ──────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

function ColorRow({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-mono">{value}</span>
        <label className="relative w-8 h-8 rounded-md border border-gray-300 overflow-hidden cursor-pointer shadow-sm">
          <div className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, unit = 'px', onChange
}: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="px-4 py-2.5 border-b border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SelectRow({
  label, value, options, onChange
}: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ThemePreview({ theme }: { theme: ThemeConfig }) {
  const btnCheckoutRadius =
    theme.btnCheckoutShape === 'pill' ? 9999 :
    theme.btnCheckoutShape === 'square' ? 0 :
    theme.btnRadius;

  const cardShadowMap = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.1)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.15)',
  };

  return (
    <div
      className="h-full overflow-auto p-8"
      style={{
        background: theme.colorBackground,
        fontFamily: theme.fontFamily,
        fontSize: theme.fontSizeBase,
      }}
      dir="rtl"
    >
      <div
        className="w-full px-8 py-4 mb-8 flex items-center justify-between rounded-lg"
        style={{ background: theme.colorPrimary, color: '#fff' }}
      >
        <span className="font-bold text-lg">יורסופר</span>
        <div className="flex gap-6 text-sm opacity-80">
          <span>מזוזות</span>
          <span>תפילין</span>
          <span>ספרי תורה</span>
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: theme.cardGap }}>
        {['מזוזה מהודרת', 'תפילין בית יוסף', 'מגילת אסתר'].map((name, i) => (
          <div
            key={i}
            style={{
              background: theme.colorSurface,
              borderRadius: theme.cardRadius,
              boxShadow: cardShadowMap[theme.cardShadow as keyof typeof cardShadowMap],
              padding: theme.cardPadding,
              overflow: 'hidden',
            }}
          >
            <div
              className="w-full mb-3 flex items-center justify-center text-3xl"
              style={{
                height: theme.cardImgHeight,
                background: `${theme.colorPrimary}15`,
                borderRadius: Math.max(0, theme.cardRadius - 4),
              }}
            >
              {['📜', '🕍', '📖'][i]}
            </div>

            <h4 className="font-semibold mb-1" style={{ color: theme.colorText }}>{name}</h4>
            <p className="text-sm mb-3" style={{ color: theme.colorTextMuted }}>
              סופר מוסמך, כתב אשורי
            </p>

            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-lg" style={{ color: theme.colorSecondary }}>
                ₪{[249, 890, 1200][i]}
              </span>
              <span className="text-xs line-through" style={{ color: theme.colorTextMuted }}>
                ₪{[299, 990, 1400][i]}
              </span>
            </div>

            <button
              className="w-full text-sm font-medium py-2 mb-2 transition-opacity hover:opacity-90"
              style={{
                background: theme.btnAddToCartBg,
                color: theme.btnAddToCartText,
                borderRadius: theme.btnRadius,
              }}
            >
              🛒 הוסף לעגלה
            </button>

            <button
              className="w-full text-sm font-medium py-2 transition-opacity hover:opacity-90"
              style={{
                background: theme.btnCheckoutBg,
                color: theme.btnCheckoutText,
                borderRadius: btnCheckoutRadius,
              }}
            >
              לתשלום ✓
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs mt-8" style={{ color: theme.colorTextMuted }}>
        תצוגה מקדימה — זו לא האתר החי
      </p>
    </div>
  );
}

export default function ThemeEditorPage() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [savedTheme, setSavedTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'buttons' | 'cards' | 'spacing'>('colors');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'theme'));
        if (snap.exists()) {
          const data = { ...DEFAULT_THEME, ...snap.data() } as ThemeConfig;
          setTheme(data);
          setSavedTheme(data);
        }
      } catch (e) {
        console.error('שגיאה בטעינת הנושא', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = useCallback(<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  }, []);

  const hasChanges = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'theme'), theme);
      setSavedTheme(theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('לאפס את כל ההגדרות לברירת המחדל?')) {
      setTheme(DEFAULT_THEME);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">טוען הגדרות עיצוב...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'colors', label: '🎨 צבעים' },
    { id: 'buttons', label: '🔘 כפתורים' },
    { id: 'cards', label: '📦 כרטיסי מוצר' },
    { id: 'spacing', label: '📐 ריווחים' },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎨</span>
          <div>
            <h1 className="font-bold text-gray-800 text-base leading-tight">עורך עיצוב</h1>
            <p className="text-xs text-gray-400">שינויים נשמרים לכל האתר</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              ● יש שינויים לא שמורים
            </span>
          )}
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            ↺ איפוס
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`text-sm font-semibold px-5 py-1.5 rounded-lg transition ${
              saved
                ? 'bg-green-600 text-white'
                : hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? '...שומר' : saved ? '✓ נשמר!' : 'שמור שינויים'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-md">
          <div className="flex border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 text-xs py-2.5 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'colors' && (
              <>
                <SectionTitle>צבעי מותג</SectionTitle>
                <ColorRow label="צבע ראשי (Header, רקע כפתורים)" value={theme.colorPrimary} onChange={v => update('colorPrimary', v)} />
                <ColorRow label="צבע משני (הדגשות, מחיר)" value={theme.colorSecondary} onChange={v => update('colorSecondary', v)} />
                <SectionTitle>רקעים</SectionTitle>
                <ColorRow label="רקע האתר" value={theme.colorBackground} onChange={v => update('colorBackground', v)} />
                <ColorRow label="רקע כרטיסים" value={theme.colorSurface} onChange={v => update('colorSurface', v)} />
                <SectionTitle>טקסט</SectionTitle>
                <ColorRow label="טקסט ראשי" value={theme.colorText} onChange={v => update('colorText', v)} />
                <ColorRow label="טקסט משני (תיאורים)" value={theme.colorTextMuted} onChange={v => update('colorTextMuted', v)} />
              </>
            )}

            {activeTab === 'buttons' && (
              <>
                <SectionTitle>כפתור "הוסף לעגלה"</SectionTitle>
                <ColorRow label="צבע רקע" value={theme.btnAddToCartBg} onChange={v => update('btnAddToCartBg', v)} />
                <ColorRow label="צבע טקסט" value={theme.btnAddToCartText} onChange={v => update('btnAddToCartText', v)} />
                <SectionTitle>כפתור "לתשלום"</SectionTitle>
                <ColorRow label="צבע רקע" value={theme.btnCheckoutBg} onChange={v => update('btnCheckoutBg', v)} />
                <ColorRow label="צבע טקסט" value={theme.btnCheckoutText} onChange={v => update('btnCheckoutText', v)} />
                <SelectRow
                  label="צורת כפתור תשלום"
                  value={theme.btnCheckoutShape}
                  onChange={v => update('btnCheckoutShape', v)}
                  options={[
                    { value: 'square', label: '■ מרובע' },
                    { value: 'rounded', label: '▢ מעוגל' },
                    { value: 'pill', label: '⬭ עגול לגמרי' },
                  ]}
                />
                <SectionTitle>כלל הכפתורים</SectionTitle>
                <SliderRow label="עיגול פינות" value={theme.btnRadius} min={0} max={24} onChange={v => update('btnRadius', v)} />
              </>
            )}

            {activeTab === 'cards' && (
              <>
                <SectionTitle>כרטיס מוצר</SectionTitle>
                <SliderRow label="עיגול פינות הכרטיס" value={theme.cardRadius} min={0} max={32} onChange={v => update('cardRadius', v)} />
                <SliderRow label="ריפוד פנימי (Padding)" value={theme.cardPadding} min={8} max={40} onChange={v => update('cardPadding', v)} />
                <SliderRow label="גובה תמונת מוצר" value={theme.cardImgHeight} min={120} max={400} onChange={v => update('cardImgHeight', v)} />
                <SelectRow
                  label="צל הכרטיס"
                  value={theme.cardShadow}
                  onChange={v => update('cardShadow', v)}
                  options={[
                    { value: 'none', label: 'ללא צל' },
                    { value: 'sm', label: 'צל קל' },
                    { value: 'md', label: 'צל בינוני' },
                    { value: 'lg', label: 'צל חזק' },
                  ]}
                />
              </>
            )}

            {activeTab === 'spacing' && (
              <>
                <SectionTitle>רשת מוצרים</SectionTitle>
                <SliderRow label="מרווח בין כרטיסים" value={theme.cardGap} min={8} max={64} onChange={v => update('cardGap', v)} />
                <SectionTitle>פריסה כללית</SectionTitle>
                <SliderRow label="ריפוד סקשן" value={theme.sectionPadding} min={16} max={120} onChange={v => update('sectionPadding', v)} />
                <SliderRow label="רוחב מקסימלי" value={theme.containerMaxWidth} min={960} max={1600} unit="px" onChange={v => update('containerMaxWidth', v)} />
                <SectionTitle>טיפוגרפיה</SectionTitle>
                <SliderRow label="גודל פונט בסיס" value={theme.fontSizeBase} min={12} max={22} onChange={v => update('fontSizeBase', v)} />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ThemePreview theme={theme} />
        </div>
      </div>
    </div>
  );
}