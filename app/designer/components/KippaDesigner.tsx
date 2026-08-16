'use client';
// עורך הכיפה — state + layout. עטוף ב-KippaDesignModal.
// הלקוח כבר בחר את המוצר (צבע/סוג) — לכן אין בורר צבע כיפה:
// התמונה האמיתית של המוצר משמשת רקע, והעורך שולט בטקסט בלבד.

import { useEffect, useState } from 'react';
import KippaCanvas, { exportKippaPng, clampOffset } from './KippaCanvas';
import ColorPicker from './ColorPicker';
import TextPanel from './TextPanel';
import ControlsBar from './ControlsBar';
import { KIPPA_TEXT_COLORS, KIPPA_FONTS_GOOGLE_URL, type KippaDesign } from '../utils/types';
import { uploadDesignToCloudinary, generateDesignId } from '../utils/kippaDesignService';
import { KIPA_MIN_QTY, type KipaMaterial } from '../../lib/kippot';

const DEFAULTS = {
  text: '',
  textColor: '#FFFFFF',
  fontSize: 26,
  fontFamily: 'Rubik',
  position: 'center' as KippaDesign['position'],
  offset: { x: 0, y: 0 },
};

export default function KippaDesigner({
  material,
  productImageUrl,
  initialDesign,
  onSave,
  onCancel,
}: {
  material: KipaMaterial;
  /** תמונת המוצר שנבחר — הרקע של העיצוב */
  productImageUrl?: string;
  /** עריכת עיצוב קיים מהעגלה */
  initialDesign?: KippaDesign | null;
  onSave: (design: KippaDesign) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [text, setText]             = useState(initialDesign?.text       ?? DEFAULTS.text);
  const [textColor, setTextColor]   = useState(initialDesign?.textColor  ?? DEFAULTS.textColor);
  const [fontSize, setFontSize]     = useState(initialDesign?.fontSize   ?? DEFAULTS.fontSize);
  const [fontFamily, setFontFamily] = useState(initialDesign?.fontFamily ?? DEFAULTS.fontFamily);
  const [position, setPosition]     = useState<KippaDesign['position']>(initialDesign?.position ?? DEFAULTS.position);
  // הזזה חופשית של הטקסט על הכיפה (גרירה בעכבר/אצבע)
  const [offset, setOffset]         = useState<{ x: number; y: number }>(
    clampOffset(initialDesign?.offset ?? DEFAULTS.offset),
  );
  const [quantity, setQuantity]     = useState(Math.max(initialDesign?.quantity ?? KIPA_MIN_QTY, KIPA_MIN_QTY));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const bgImage = productImageUrl || initialDesign?.productImageUrl;

  // טעינת מבחר הפונטים מ-Google Fonts (פעם אחת)
  useEffect(() => {
    const id = 'kippa-designer-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = KIPPA_FONTS_GOOGLE_URL;
    document.head.appendChild(link);
  }, []);

  // responsive: 400px דסקטופ / 300px מובייל
  const [canvasSize, setCanvasSize] = useState(400);
  useEffect(() => {
    const update = () => setCanvasSize(window.innerWidth < 640 ? 300 : 400);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const spec = { baseColor: '', productImageUrl: bgImage, text, textColor, fontSize, fontFamily, position, offset };

  const moved = offset.x !== 0 || offset.y !== 0;

  function reset() {
    setText(DEFAULTS.text);
    setTextColor(DEFAULTS.textColor);
    setFontSize(DEFAULTS.fontSize);
    setFontFamily(DEFAULTS.fontFamily);
    setPosition(DEFAULTS.position);
    setOffset({ ...DEFAULTS.offset });
    setError('');
  }

  // בחירת מיקום מהכפתורים (למעלה/מרכז/למטה) מאפסת את הגרירה הידנית
  function changePosition(p: KippaDesign['position']) {
    setPosition(p);
    setOffset({ ...DEFAULTS.offset });
  }

  async function save() {
    setError('');
    if (!text.trim()) { setError('נא להזין טקסט לעיצוב הכיפה'); return; }
    setSaving(true);
    try {
      const png = await exportKippaPng(spec, 400, 3); // pixelRatio 3 — איכות הדפסה
      const previewImageUrl = await uploadDesignToCloudinary(png);
      const design: KippaDesign = {
        designId: initialDesign?.designId ?? generateDesignId(),
        baseColor: '',
        productImageUrl: bgImage,
        text: text.trim(), textColor, fontSize, fontFamily, position, offset,
        quantity: Math.max(quantity, KIPA_MIN_QTY),
        previewImageUrl,
        createdAt: initialDesign?.createdAt ?? new Date().toISOString(),
      };
      await onSave(design);
    } catch (e) {
      console.error('[kippa-designer] save failed:', e);
      setError('שמירת העיצוב נכשלה — נסו שוב בעוד רגע');
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: '#f8fafc', borderRadius: 14, padding: 10, border: '1px solid #e5e7eb' }}>
        <KippaCanvas spec={spec} size={canvasSize} onOffsetChange={setOffset} />

        {/* רמז גרירה + מרכוז מחדש */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
            {text.trim()
              ? '✋ גררו את הטקסט על הכיפה למיקום המדויק (עכבר או אצבע)'
              : 'הקלידו טקסט למטה — ואז אפשר לגרור אותו למקום הרצוי'}
          </span>
          {moved && (
            <button
              type="button"
              onClick={() => setOffset({ x: 0, y: 0 })}
              style={{
                background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
                padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#2563eb',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↺ החזרה למרכז
            </button>
          )}
        </div>
      </div>

      <TextPanel
        text={text} onText={setText}
        fontFamily={fontFamily} onFont={setFontFamily}
        fontSize={fontSize} onFontSize={setFontSize}
        position={position} onPosition={changePosition}
      />
      <ColorPicker label="צבע הטקסט" colors={KIPPA_TEXT_COLORS} value={textColor} onChange={setTextColor} />

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <ControlsBar
        quantity={quantity}
        onQuantity={setQuantity}
        material={material}
        saving={saving}
        onSave={save}
        onReset={reset}
        onCancel={onCancel}
      />
    </div>
  );
}
