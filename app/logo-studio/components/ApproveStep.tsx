'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import s from '../LogoStudio.module.css';
import type { ProjectView, MockupView, CatalogProduct } from '../studioApi';
import { getLogoFont } from '@/lib/logoStudio/fonts';
import { LOGO_STYLES, LOGO_SYMBOLS, LOGO_EVENTS } from '@/lib/logoStudio/types';
import { KIPA_MIN_QTY, getKipaUnitPrice } from '@/app/lib/kippot';
import { MOCKUP_DISCLAIMER } from './MockupStep';

const QTY_OPTIONS = [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300, 400, 500];

interface Props {
  project: ProjectView;
  product: CatalogProduct | null;
  mockup: MockupView | null;
  busy: boolean;
  error: string | null;
  onApprove: (qty: number) => void;
  onBack: () => void;
}

export default function ApproveStep({ project, product, mockup, busy, error, onApprove, onBack }: Props) {
  const [qty, setQty] = useState(KIPA_MIN_QTY);
  const version = project.versions.find(v => v.id === project.currentVersionId) ?? project.versions[0];
  const sel = project.selection;
  const material = sel.materialKind === 'satin' ? 'satin' : 'linen';
  const unit = getKipaUnitPrice(qty, material);
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
          <select id="ls-qty" className={s.select} value={qty} onChange={e => setQty(Number(e.target.value))}>
            {QTY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
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
