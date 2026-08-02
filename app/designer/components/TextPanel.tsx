'use client';
// פאנל טקסט: תוכן, פונט, גודל, מיקום

import { KIPPA_FONTS, KIPPA_FONT_MIN, KIPPA_FONT_MAX, KIPPA_POSITIONS } from '../utils/types';
import type { KippaDesign } from '../utils/types';

export default function TextPanel({
  text, onText,
  fontFamily, onFont,
  fontSize, onFontSize,
  position, onPosition,
}: {
  text: string; onText: (v: string) => void;
  fontFamily: string; onFont: (v: string) => void;
  fontSize: number; onFontSize: (v: number) => void;
  position: KippaDesign['position']; onPosition: (v: KippaDesign['position']) => void;
}) {
  const selStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: 14, background: '#fff', color: '#111827',
  };
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
          טקסט על הכיפה <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Enter — שורה חדשה, עד 3 שורות)</span>
        </div>
        <textarea
          value={text}
          onChange={e => {
            // עד 3 שורות — שורות נוספות מתאחדות לשורה השלישית
            const lines = e.target.value.split('\n');
            onText(lines.length > 3 ? [...lines.slice(0, 2), lines.slice(2).join(' ')].join('\n') : e.target.value);
          }}
          placeholder={'לדוגמה: הבר מצווה של דניאל\nכ"ג אדר תשפ"ו'}
          maxLength={90}
          rows={2}
          dir="rtl"
          style={{ ...selStyle, resize: 'vertical', minHeight: 44, fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>פונט</div>
          <select value={fontFamily} onChange={e => onFont(e.target.value)} style={selStyle}>
            {KIPPA_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>מיקום</div>
          <select value={position} onChange={e => onPosition(e.target.value as KippaDesign['position'])} style={selStyle}>
            {KIPPA_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
          גודל טקסט: <span style={{ color: '#2563eb' }}>{fontSize}</span>
        </div>
        <input
          type="range"
          min={KIPPA_FONT_MIN}
          max={KIPPA_FONT_MAX}
          value={fontSize}
          onChange={e => onFontSize(Number(e.target.value))}
          style={{ width: '100%' }}
          aria-label="גודל טקסט"
        />
      </div>
    </div>
  );
}
