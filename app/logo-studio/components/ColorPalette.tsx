'use client';
import { useMemo, useState } from 'react';
import s from '../LogoStudio.module.css';
import { PRESET_COLORS, HEX_RE } from '@/lib/logoStudio/types';
import { hslToRgb, rgbToHex } from '@/lib/logoStudio/color';

// Canva-style colour board: popular print colours, a full hue × shade grid,
// greys, a hex field and the native picker. Recently used colours are kept
// for the session only (state, not storage).

const HUES: { name: string; h: number; s: number }[] = [
  { name: 'אדום', h: 0, s: 0.72 }, { name: 'כתום', h: 24, s: 0.85 }, { name: 'ענבר', h: 40, s: 0.88 },
  { name: 'צהוב', h: 52, s: 0.9 }, { name: 'ליים', h: 80, s: 0.6 }, { name: 'ירוק', h: 130, s: 0.5 },
  { name: 'טורקיז', h: 170, s: 0.6 }, { name: 'תכלת', h: 195, s: 0.7 }, { name: 'כחול', h: 215, s: 0.72 },
  { name: 'אינדיגו', h: 240, s: 0.55 }, { name: 'סגול', h: 275, s: 0.5 }, { name: 'ורוד', h: 330, s: 0.7 },
];
const LIGHTNESS = [0.88, 0.74, 0.6, 0.48, 0.36, 0.24, 0.14];

const EXTRA: { hex: string; name: string }[] = [
  { hex: '#D4AF37', name: 'זהב מטאלי' }, { hex: '#C9A227', name: 'זהב' }, { hex: '#B08D57', name: 'ברונזה' },
  { hex: '#A8A9AD', name: 'כסף' }, { hex: '#E5E4E2', name: 'פלטינה' }, { hex: '#F5F0E1', name: 'שמנת' },
  { hex: '#0B1F3A', name: 'נייבי' }, { hex: '#4B2E2A', name: 'חום שוקולד' }, { hex: '#6B0F1A', name: 'יין' },
  { hex: '#1B4D3E', name: 'ירוק בקבוק' }, { hex: '#7D8B6A', name: 'זית' }, { hex: '#C08497', name: 'ורוד עתיק' },
];

export default function ColorPalette({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hexText, setHexText] = useState(value);
  const [recent, setRecent] = useState<string[]>([]);

  const grid = useMemo(() => LIGHTNESS.map(l => HUES.map(h => rgbToHex(...hslToRgb(h.h / 360, h.s, l)))), []);
  const greys = useMemo(() => Array.from({ length: 12 }, (_, i) => { const v = Math.round(255 - (i * 255) / 11); return rgbToHex(v, v, v); }), []);

  const pick = (hex: string) => {
    const h = hex.toUpperCase();
    onChange(h);
    setHexText(h);
    setRecent(prev => [h, ...prev.filter(x => x !== h)].slice(0, 12));
  };

  const Swatch = ({ hex, title }: { hex: string; title?: string }) => (
    <button type="button" className={s.paletteSwatch} data-active={value.toUpperCase() === hex.toUpperCase()}
      style={{ background: hex }} title={title ? `${title} ${hex}` : hex} aria-label={title ? `${title} ${hex}` : hex} onClick={() => pick(hex)} />
  );

  return (
    <div>
      <div className={s.swatches}>
        {PRESET_COLORS.map(c => (
          <button key={c.hex} type="button" className={s.swatch} data-active={value === c.hex} style={{ background: c.hex }} title={c.name} aria-label={c.name} onClick={() => pick(c.hex)} />
        ))}
      </div>

      <div className={s.row} style={{ marginTop: 10 }}>
        <span className={s.swatch} style={{ background: value, cursor: 'default' }} aria-hidden />
        <input
          className={s.input} style={{ width: 120, fontSize: 15 }} dir="ltr" value={hexText} maxLength={7} aria-label="קוד צבע HEX"
          onChange={e => {
            const t = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setHexText(t);
            if (HEX_RE.test(t)) pick(t);
          }}
        />
        <label className={s.row} style={{ gap: 4, fontSize: 12 }}>
          <input type="color" className={s.colorInput} value={value.toLowerCase()} onChange={e => pick(e.target.value)} aria-label="בורר צבעים" />
          בורר
        </label>
        <button type="button" className={s.ghost} onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'סגירת לוח הצבעים' : '🎨 לוח צבעים מלא'}
        </button>
      </div>

      {open && (
        <div className={s.paletteBox}>
          {recent.length > 0 && (
            <>
              <div className={s.paletteTitle}>בשימוש לאחרונה</div>
              <div className={s.paletteGrid}>{recent.map(h => <Swatch key={`r${h}`} hex={h} />)}</div>
            </>
          )}
          <div className={s.paletteTitle}>צבעים מיוחדים להדפסה</div>
          <div className={s.paletteGrid}>{EXTRA.map(c => <Swatch key={c.hex} hex={c.hex} title={c.name} />)}</div>
          <div className={s.paletteTitle}>כל הגוונים</div>
          {grid.map((row, i) => (
            <div key={i} className={s.paletteGrid}>{row.map((h, j) => <Swatch key={h + j} hex={h} title={HUES[j].name} />)}</div>
          ))}
          <div className={s.paletteTitle}>אפורים</div>
          <div className={s.paletteGrid}>{greys.map(h => <Swatch key={h} hex={h} />)}</div>
          <div className={s.hint}>שימו לב: גוון המסך עשוי להיות שונה מעט מהגוון המודפס על הבד.</div>
        </div>
      )}
    </div>
  );
}
