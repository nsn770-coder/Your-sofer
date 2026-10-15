'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from 'react';
import s from '../LogoStudio.module.css';
import { LOGO_FONTS, getLogoFont } from '@/lib/logoStudio/fonts';
import {
  LOGO_STYLES, LOGO_EVENTS, LOGO_SYMBOLS, SYMBOL_POSITIONS, LIMITS,
  effectiveMonogramLetters, needsAiDecoration, needsAiMonogram, type LogoSpec,
} from '@/lib/logoStudio/types';
import { getSymbolShape, getDividerShape } from '@/lib/logoStudio/symbols';
import { relativeLuminance } from '@/lib/logoStudio/color';
import { studioApi, ApiError } from '../studioApi';
import ColorPalette from './ColorPalette';

/**
 * Example of a finished monogram on a kippah (shown on the top side).
 * Set to a Cloudinary URL to show a real photo; empty = drawn example in the customer's font and color.
 */
export const MONOGRAM_EXAMPLE_URL = '';

interface Props {
  /** the side being designed — the top side leads with the 2-letter monogram (what most customers want) */
  side?: 'top' | 'bottom';
  spec: LogoSpec;
  onChange: (patch: Partial<LogoSpec>) => void;
  errors: string[];
  signedIn: boolean;
  onRequireSignIn: () => void;
  inspirationThumb: string | null;
  onInspiration: (assetId: string | null, thumb: string | null) => void;
}

function Vector({ d, box, color, height }: { d: string; box: [number, number]; color: string; height: number }) {
  return (
    <svg viewBox={`0 0 ${box[0]} ${box[1]}`} style={{ height, width: 'auto', display: 'block', margin: '0 auto' }} aria-hidden>
      <path d={d} fill={color} fillRule="evenodd" />
    </svg>
  );
}

/** Live, approximate preview (browser text rendering with the SAME font files). */
export function LivePreview({ spec }: { spec: LogoSpec }) {
  const font = getLogoFont(spec.fontId);
  const light = relativeLuminance(spec.color) > 0.75;
  const sym = getSymbolShape(spec.symbol);
  const div = spec.showDecoration ? getDividerShape(spec.style) : null;
  const ff = `'${font.family}', Arial, sans-serif`;
  const ls = `${spec.letterSpacing + (spec.style === 'elegant' ? 0.12 : spec.style === 'minimal' ? 0.06 : 0)}em`;
  const base = 34 * spec.textScale;
  const symbol = sym ? <Vector d={sym.d} box={[100, 100]} color={spec.color} height={base * 0.75 * spec.symbolScale} /> : null;
  const ai = needsAiDecoration(spec) || needsAiMonogram(spec);
  return (
    <div className={`${s.preview} ${light ? s.dark : s.checker}`} style={{ padding: 18, flexDirection: 'column', gap: 6, textAlign: 'center' }} aria-label="תצוגה מקדימה">
      {spec.symbolPosition === 'above' && symbol}
      {spec.style === 'monogram' && (
        <div style={{ fontFamily: ff, color: spec.color, fontSize: base * 2, lineHeight: 1, border: needsAiMonogram(spec) ? '1px dashed rgba(0,0,0,.2)' : 'none', padding: '4px 10px', borderRadius: 10 }}>
          {effectiveMonogramLetters(spec) || '?'}
        </div>
      )}
      <div dir="auto" style={{ fontFamily: ff, color: spec.color, fontSize: spec.style === 'monogram' ? base * 0.45 : base, letterSpacing: ls, lineHeight: 1.15, wordBreak: 'break-word' }}>
        {spec.primaryText || (spec.style === 'monogram' ? '' : 'השמות שלכם')}
      </div>
      {div && (spec.secondaryText || spec.date || spec.style === 'classic') && <Vector d={div.d} box={[100, 10]} color={spec.color} height={9} />}
      {spec.secondaryText && <div dir="auto" style={{ fontFamily: ff, color: spec.color, fontSize: base * 0.42 * spec.secondaryScale, letterSpacing: ls }}>{spec.secondaryText}</div>}
      {spec.date && <div dir="auto" style={{ fontFamily: ff, color: spec.color, fontSize: base * 0.32 * spec.secondaryScale, letterSpacing: ls }}>{spec.date}</div>}
      {spec.symbolPosition === 'below' && symbol}
      {ai && <div className={s.src} style={{ marginTop: 6, color: light ? '#ddd' : undefined }}>✨ {spec.style === 'monogram' ? 'המונוגרמה האמנותית' : 'העיטור'} ייווצר ב-AI בשלב היצירה</div>}
    </div>
  );
}

export default function DetailsStep({ side = 'top', spec, onChange, errors, signedIn, onRequireSignIn, inspirationThumb, onInspiration }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const sample = spec.primaryText || 'דוד ושרה';

  async function onFile(f: File | undefined) {
    if (!f) return;
    setUploadErr(null);
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { setUploadErr('אפשר להעלות רק JPG, PNG או WEBP.'); return; }
    if (f.size > 6 * 1024 * 1024) { setUploadErr('הקובץ גדול מדי (עד 6MB).'); return; }
    setUploading(true);
    try {
      const r = await studioApi.upload(f);
      onInspiration(r.assetId, r.thumb);
    } catch (e) {
      setUploadErr(e instanceof ApiError ? e.messageHe ?? 'ההעלאה נכשלה.' : 'ההעלאה נכשלה.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const isMono = spec.style === 'monogram';
  const monoLetters = isMono ? (spec.monogramLetters || effectiveMonogramLetters(spec)) : '';
  const fontFamily = `'${getLogoFont(spec.fontId).family}', Arial, sans-serif`;

  /** typing letters turns the monogram on; clearing them turns it off (back to a text logo) */
  function setMonoLetters(v: string) {
    const letters = v.replace(/[^א-תA-Za-z]/g, '').slice(0, LIMITS.monogramLetters);
    if (letters) onChange({ monogramLetters: letters, style: 'monogram' });
    else onChange({ monogramLetters: '', style: isMono ? 'classic' : spec.style });
  }

  const monogramCard = (
    <div className={`${s.card} ${side === 'top' ? s.featureCard : ''}`}>
      {side === 'top' && <span className={s.featureBadge}>⭐ הבחירה הנפוצה לצד העליון</span>}
      <p className={s.cardTitle}>מונוגרמה — 2 אותיות משולבות</p>
      <div className={s.monoRow}>
        <div className={s.monoExample}>
          {MONOGRAM_EXAMPLE_URL
            ? <img src={MONOGRAM_EXAMPLE_URL} alt="דוגמה לכיפה עם מונוגרמה" />
            : (
              <svg viewBox="0 0 200 200" role="img" aria-label="דוגמה לכיפה עם מונוגרמה">
                <defs>
                  <radialGradient id="lsKippahGrad" cx="45%" cy="40%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e9e2d3" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="92" fill="url(#lsKippahGrad)" stroke="#d8cfbd" strokeWidth="2" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#d8cfbd" strokeDasharray="3 4" />
                <text x="100" y="118" textAnchor="middle" fontSize="62" fontWeight="700" fill={spec.color} style={{ fontFamily }}>{monoLetters || 'יח'}</text>
              </svg>
            )}
          <div className={s.monoExampleCap}>{monoLetters ? 'כך בערך זה ייראה' : 'דוגמה'}</div>
        </div>
        <div className={s.grow}>
          <label className={s.monoLabel} htmlFor="ls-mono">לסגנון כזה — כתבו כאן 2 אותיות</label>
          <input id="ls-mono" className={`${s.input} ${s.monoInput}`} value={monoLetters} maxLength={LIMITS.monogramLetters} dir="auto"
            onChange={e => setMonoLetters(e.target.value)} placeholder="לדוגמה: יח" style={{ fontFamily }} />
          <div className={s.hint}>בדרך כלל ראשי התיבות של שם החתן / בר המצווה (אפשר עד 3 אותיות).</div>
          {isMono && <button type="button" className={s.ghost} onClick={() => setMonoLetters('')}>ביטול המונוגרמה</button>}
        </div>
      </div>
      {isMono && (
        <>
          <span className={s.label}>סוג המונוגרמה</span>
          <div className={s.chips}>
            <button type="button" className={s.chip} data-active={spec.monogramMode === 'artistic'} onClick={() => onChange({ monogramMode: 'artistic' })}>אותיות משולבות אמנותיות (AI)</button>
            <button type="button" className={s.chip} data-active={spec.monogramMode === 'font'} onClick={() => onChange({ monogramMode: 'font' })}>אותיות רגילות בגופן שנבחר</button>
          </div>
          {spec.monogramMode === 'artistic' && (
            <div className={s.chips} style={{ marginTop: 8 }}>
              <button type="button" className={s.chip} data-active={spec.monogramFill !== 'outline'} onClick={() => onChange({ monogramFill: 'solid' })}>אותיות מלאות בצבע</button>
              <button type="button" className={s.chip} data-active={spec.monogramFill === 'outline'} onClick={() => onChange({ monogramFill: 'outline' })}>קו מתאר בלבד (חלול)</button>
            </div>
          )}
          <div className={s.hint}>המונוגרמה האמנותית נבדקת אוטומטית שהאותיות נכונות. אם הבדיקה נכשלת — תוצג מונוגרמה בגופן שבחרתם.</div>
        </>
      )}
    </div>
  );

  const textCard = (
    <div className={s.card}>
      {side === 'top' ? (
        <div className={s.textBanner}>✍️ רוצים כיתוב נוסף, או כיתוב בלי מונוגרמה? מלאו את השדות הבאים</div>
      ) : (
        <p className={s.cardTitle}>הטקסט בלוגו</p>
      )}
      <label className={s.label} htmlFor="ls-primary">
        {isMono ? 'כיתוב מתחת למונוגרמה (לא חובה)' : 'שמות, ראשי תיבות או טקסט אישי *'}
      </label>
      <input id="ls-primary" className={s.input} value={spec.primaryText} maxLength={LIMITS.primaryText}
        onChange={e => onChange({ primaryText: e.target.value })} placeholder={isMono ? 'לדוגמה: יוסף חיים' : 'לדוגמה: יוסף חיים · דוד ושרה'} dir="auto" />
      <div className={s.hint}>הטקסט ייכתב בדיוק כפי שהקלדתם, באותיות הגופן שתבחרו (ללא ניקוד).</div>

      <label className={s.label} htmlFor="ls-date">תאריך (לא חובה)</label>
      <input id="ls-date" className={s.input} value={spec.date} maxLength={LIMITS.date} onChange={e => onChange({ date: e.target.value })} placeholder="לדוגמה: כ״ג אדר תשפ״ז או 12.03.2027" dir="auto" />

      <label className={s.label} htmlFor="ls-sec">טקסט משני (לא חובה)</label>
      <input id="ls-sec" className={s.input} value={spec.secondaryText} maxLength={LIMITS.secondaryText} onChange={e => onChange({ secondaryText: e.target.value })} placeholder="לדוגמה: בר מצווה" dir="auto" />
    </div>
  );

  return (
    <div className={s.twoCol}>
      <div>
        {side === 'top' ? <>{monogramCard}{textCard}</> : <>{textCard}{monogramCard}</>}

        <div className={s.card}>
          <p className={s.cardTitle}>סוג האירוע</p>
          <div className={s.chips}>
            {LOGO_EVENTS.map(ev => (
              <button key={ev.id} type="button" className={s.chip} data-active={spec.eventType === ev.id} onClick={() => onChange({ eventType: ev.id })}>{ev.label}</button>
            ))}
          </div>
          <div className={s.hint}>משפיע על סגנון העיטור בלבד — לא נכתב בלוגו.</div>
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>גופן</p>
          <div className={s.fontGrid} role="radiogroup" aria-label="בחירת גופן">
            {LOGO_FONTS.map(f => (
              <button key={f.id} type="button" role="radio" aria-checked={spec.fontId === f.id} className={s.fontTile} data-active={spec.fontId === f.id} onClick={() => onChange({ fontId: f.id })}>
                <div className={s.fontSample} dir="auto" style={{ fontFamily: `'${f.family}', Arial` }}>{sample}</div>
                <div className={s.fontName}>{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>צבע</p>
          <ColorPalette value={spec.color} onChange={hex => onChange({ color: hex })} />
          <div className={s.hint}>הצבע שנבחר: <b dir="ltr">{spec.color}</b></div>
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>{isMono ? 'סמל (לא חובה)' : 'סגנון וסמל'}</p>
          {!isMono && (
            <>
              <div className={s.chips}>
                {LOGO_STYLES.filter(st => st.id !== 'monogram').map(st => (
                  <button key={st.id} type="button" className={s.chip} data-active={spec.style === st.id} onClick={() => onChange({ style: st.id })} title={st.hint}>{st.label}</button>
                ))}
              </div>
              <div className={s.hint}>{LOGO_STYLES.find(x => x.id === spec.style)?.hint}</div>
              <span className={s.label}>סמל (לא חובה)</span>
            </>
          )}
          <div className={s.chips}>
            {LOGO_SYMBOLS.map(sy => (
              <button key={sy.id} type="button" className={s.chip} data-active={spec.symbol === sy.id} onClick={() => onChange({ symbol: sy.id })}>{sy.label}</button>
            ))}
          </div>
          {spec.symbol !== 'none' && (
            <div className={s.chips} style={{ marginTop: 8 }}>
              {SYMBOL_POSITIONS.map(sp => (
                <button key={sp.id} type="button" className={s.chip} data-active={spec.symbolPosition === sp.id} onClick={() => onChange({ symbolPosition: sp.id })}>{sp.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>הערות ותמונת השראה (לא חובה)</p>
          <textarea className={s.textarea} value={spec.notes} maxLength={LIMITS.notes} onChange={e => onChange({ notes: e.target.value })}
            placeholder="לדוגמה: עיטור עדין של ענפי זית" />
          <div className={s.hint}>ההערות משפיעות על העיטור הגרפי בלבד. טקסט שיופיע בלוגו מזינים רק בשדות הטקסט.</div>
          <div className={s.row} style={{ marginTop: 10 }}>
            {inspirationThumb && <img src={inspirationThumb} alt="תמונת השראה" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2dccf' }} />}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => onFile(e.target.files?.[0])} />
            <button type="button" className={s.secondary} disabled={uploading}
              onClick={() => (signedIn ? fileRef.current?.click() : onRequireSignIn())}>
              {uploading ? <span className={`${s.spinner} ${s.spinnerDark}`} /> : inspirationThumb ? 'החלפת תמונה' : 'העלאת תמונת השראה'}
            </button>
            {inspirationThumb && <button type="button" className={s.ghost} onClick={() => onInspiration(null, null)}>הסרה</button>}
          </div>
          {!signedIn && <div className={s.hint}>מכינים את הסטודיו…</div>}
          {uploadErr && <div className={s.error}>{uploadErr}</div>}
        </div>
      </div>

      <div>
        <div className={s.card} style={{ position: 'sticky', top: 70 }}>
          <p className={s.cardTitle}>תצוגה מקדימה</p>
          <LivePreview spec={spec} />
          <div className={s.hint}>תצוגה משוערת בגופן שבחרתם. הלוגו הסופי ייווצר כקובץ PNG שקוף ומדויק.</div>
          {errors.length > 0 && <div className={s.warn}>{errors[0]}</div>}
        </div>
      </div>
    </div>
  );
}
