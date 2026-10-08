'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import s from '../LogoStudio.module.css';
import type { ProjectView, MockupView, CatalogProduct } from '../studioApi';
import { getLogoFont } from '@/lib/logoStudio/fonts';
import { LOGO_STYLES, LOGO_SYMBOLS, LOGO_EVENTS } from '@/lib/logoStudio/types';
import { KIPA_MIN_QTY, KIPA_EXTRA_SIDE_PRICE, getKipaUnitPrice } from '@/app/lib/kippot';
import { MOCKUP_DISCLAIMER } from './MockupStep';

const QTY_OPTIONS = [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300, 400, 500];

interface Props {
  project: ProjectView;
  product: CatalogProduct | null;
  mockup: MockupView | null;
  busy: boolean;
  error: string | null;
  /** quantity carried from /kippot-order or /event-kippot */
  initialQty?: number;
  /** set when this design will be added as the second side of a line already in the cart */
  secondSideOf?: { quantity: number; sides: ('top' | 'bottom')[] } | null;
  onApprove: (qty: number) => void;
  onBack: () => void;
}

export default function ApproveStep({ project, product, mockup, busy, error, initialQty, secondSideOf, onApprove, onBack }: Props) {
  const [qtyState, setQty] = useState(initialQty && initialQty >= KIPA_MIN_QTY ? initialQty : KIPA_MIN_QTY);
  const qty = secondSideOf ? secondSideOf.quantity : qtyState;
  const qtyOptions = QTY_OPTIONS.includes(qty) ? QTY_OPTIONS : [...QTY_OPTIONS, qty].sort((a, b) => a - b);
  const version = project.versions.find(v => v.id === project.currentVersionId) ?? project.versions[0];
  const sel = project.selection;
  const material = sel.materialKind === 'satin' ? 'satin' : 'linen';
  const unit = getKipaUnitPrice(qty, material) + (secondSideOf ? KIPA_EXTRA_SIDE_PRICE : 0);
  const mockupOk = !!mockup && mockup.versionId === version?.id && !mockup.stale;
  const spec = version?.spec;

  if (!version || !spec) return <div className={s.card}>צרו קודם לוגו.</div>;

  return (
    <div className={s.twoCol}>
      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>סיכום העיצוב</p>
          <div className={s.row} style={{ alignItems: 'stretch' }}>
            <div className={`${s.canvasWrap} ${s.checker}`} style={{ flex: 1, minWidth: 140 }}>
              <img className={s.logoImg} src={version.logo.thumb} alt={`לוגו גרסה ${version.n}`} />
            </div>
            <div className={s.canvasWrap} style={{ flex: 1, minWidth: 140 }}>
              {mockup && <img className={s.logoImg} src={mockup.thumb} alt="ההדמיה שתאושר" />}
              {!mockupOk && <div className={s.stale}>יש ליצור הדמיה לגרסה {version.n}</div>}
            </div>
          </div>
          <p className={s.disclaimer}>{MOCKUP_DISCLAIMER}</p>
          <dl className={s.kv} style={{ marginTop: 10 }}>
            <dt>כיפה</dt><dd>{product?.name ?? ''}{Object.values(project.selectedVariants).length ? ` · ${Object.values(project.selectedVariants).join(' · ')}` : ''}</dd>
            <dt>צד</dt><dd>{project.side === 'bottom' ? 'תחתון (פנים הכיפה)' : 'עליון'}</dd>
            <dt>גרסה</dt><dd>{version.n}</dd>
            <dt>טקסט</dt><dd dir="auto">{spec.primaryText || '—'}</dd>
            {spec.secondaryText && <><dt>טקסט משני</dt><dd dir="auto">{spec.secondaryText}</dd></>}
            {spec.date && <><dt>תאריך</dt><dd dir="auto">{spec.date}</dd></>}
            <dt>גופן</dt><dd>{getLogoFont(spec.fontId).label}</dd>
            <dt>צבע</dt><dd><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: spec.color, border: '1px solid #ccc', verticalAlign: 'middle' }} /> <span dir="ltr">{spec.color}</span></dd>
            <dt>סגנון</dt><dd>{LOGO_STYLES.find(x => x.id === spec.style)?.label}</dd>
            <dt>סמל</dt><dd>{LOGO_SYMBOLS.find(x => x.id === spec.symbol)?.label}</dd>
            <dt>אירוע</dt><dd>{LOGO_EVENTS.find(x => x.id === spec.eventType)?.label}</dd>
            {mockup && <><dt>גימור</dt><dd>{mockup.finish === 'embroidery' ? 'רקמה' : 'הדפסה'}</dd></>}
          </dl>
        </div>
      </div>
      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>כמות והוספה לסל</p>
          <label className={s.label} htmlFor="ls-qty">כמות כיפות (מינימום {KIPA_MIN_QTY})</label>
          {secondSideOf ? (
            <div className={s.ok}>העיצוב יתווסף כצד השני של {secondSideOf.quantity} הכיפות שכבר בסל (+₪{KIPA_EXTRA_SIDE_PRICE} לכיפה, כלול במחיר).</div>
          ) : (
            <select id="ls-qty" className={s.select} value={qty} onChange={e => setQty(Number(e.target.value))}>
              {qtyOptions.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          )}
          <div style={{ fontSize: 15, marginTop: 10 }}>₪{unit} לכיפה · סה״כ <b>₪{(unit * qty).toLocaleString('he-IL')}</b></div>
          <div className={s.hint}>המחיר לפי מדרגות הכמות של כיפות לאירועים, כולל ההדפסה.</div>
          <div className={s.hint}>באישור נשמר עותק קבוע של הגרסה וההדמיה האלה להזמנה. שינויים עתידיים בפרויקט לא ישנו אותו.</div>
          {error && <div className={s.error} role="alert">{error}</div>}
          <button type="button" className={s.primary} style={{ marginTop: 12 }} disabled={!mockupOk || busy} onClick={() => onApprove(qty)}>
            {busy ? <span className={s.spinner} /> : 'אישור והוספה לסל'}
          </button>
          {!mockupOk && <button type="button" className={s.ghost} onClick={onBack}>חזרה ליצירת הדמיה</button>}
        </div>
      </div>
    </div>
  );
}
