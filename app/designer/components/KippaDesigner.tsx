'use client';
// עורך הכיפה — state + layout. עטוף ב-KippaDesignModal.

import { useEffect, useState } from 'react';
import KippaCanvas, { exportKippaPng } from './KippaCanvas';
import ColorPicker from './ColorPicker';
import TextPanel from './TextPanel';
import ControlsBar from './ControlsBar';
import { KIPPA_BASE_COLORS, KIPPA_TEXT_COLORS, type KippaDesign } from '../utils/types';
import { uploadDesignToCloudinary, generateDesignId } from '../utils/kippaDesignService';
import { KIPA_MIN_QTY, type KipaMaterial } from '../../lib/kippot';

const DEFAULTS = {
  baseColor: '#1E40AF',
  text: '',
  textColor: '#FFFFFF',
  fontSize: 26,
  fontFamily: 'Rubik',
  position: 'center' as KippaDesign['position'],
};

export default function KippaDesigner({
  material,
  initialDesign,
  onSave,
  onCancel,
}: {
  material: KipaMaterial;
  /** עריכת עיצוב קיים מהעגלה */
  initialDesign?: KippaDesign | null;
  onSave: (design: KippaDesign) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [baseColor, setBaseColor]   = useState(initialDesign?.baseColor  ?? DEFAULTS.baseColor);
  const [text, setText]             = useState(initialDesign?.text       ?? DEFAULTS.text);
  const [textColor, setTextColor]   = useState(initialDesign?.textColor  ?? DEFAULTS.textColor);
  const [fontSize, setFontSize]     = useState(initialDesign?.fontSize   ?? DEFAULTS.fontSize);
  const [fontFamily, setFontFamily] = useState(initialDesign?.fontFamily ?? DEFAULTS.fontFamily);
  const [position, setPosition]     = useState<KippaDesign['position']>(initialDesign?.position ?? DEFAULTS.position);
  const [quantity, setQuantity]     = useState(Math.max(initialDesign?.quantity ?? KIPA_MIN_QTY, KIPA_MIN_QTY));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // responsive: 400px דסקטופ / 300px מובייל
  const [canvasSize, setCanvasSize] = useState(400);
  useEffect(() => {
    const update = () => setCanvasSize(window.innerWidth < 640 ? 300 : 400);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const spec = { baseColor, text, textColor, fontSize, fontFamily, position };

  function reset() {
    setBaseColor(DEFAULTS.baseColor);
    setText(DEFAULTS.text);
    setTextColor(DEFAULTS.textColor);
    setFontSize(DEFAULTS.fontSize);
    setFontFamily(DEFAULTS.fontFamily);
    setPosition(DEFAULTS.position);
    setError('');
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
        baseColor, text: text.trim(), textColor, fontSize, fontFamily, position,
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
        <KippaCanvas spec={spec} size={canvasSize} />
      </div>

      <ColorPicker label="צבע הכיפה" colors={KIPPA_BASE_COLORS} value={baseColor} onChange={setBaseColor} />
      <TextPanel
        text={text} onText={setText}
        fontFamily={fontFamily} onFont={setFontFamily}
        fontSize={fontSize} onFontSize={setFontSize}
        position={position} onPosition={setPosition}
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
