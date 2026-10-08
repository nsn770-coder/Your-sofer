'use client';
/* eslint-disable @next/next/no-img-element */
import { useMemo, useRef, useState } from 'react';
import s from '../LogoStudio.module.css';
import type { ProjectView, QuotaView, MockupView } from '../studioApi';
import { clampPlacement, type Placement } from '@/lib/logoStudio/catalog';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { selectionStatusText } from './KippahStep';

export const MOCKUP_DISCLAIMER = 'ההדמיה להמחשה; ייתכנו הבדלים קלים בגוון ובמיקום';

interface Props {
  project: ProjectView;
  quota: QuotaView | null;
  busy: null | 'mockup' | 'aiMockup';
  selectedMockupId: string | null;
  onSelectMockup: (id: string) => void;
  onCompose: (placement: Placement, finish: 'print' | 'embroidery') => void;
  onAiMockup: (placement: Placement, finish: 'print' | 'embroidery', confirmCharge: boolean) => void;
  onBackToKippah: () => void;
  onNext: () => void;
  blocked: boolean;
}

export default function MockupStep(p: Props) {
  const sel = p.project.selection;
  const version = p.project.versions.find(v => v.id === p.project.currentVersionId) ?? p.project.versions[0];
  const versionMockups = p.project.mockups.filter(m => m.versionId === version?.id && !m.stale);
  const lastForVersion = versionMockups[0] ?? null;
  const shown: MockupView | null = p.project.mockups.find(m => m.id === p.selectedMockupId) ?? lastForVersion ?? p.project.mockups[0] ?? null;
  const shownVersion = shown ? p.project.versions.find(v => v.id === shown.versionId) : null;
  const shownOutdated = !!shown && (shown.versionId !== version?.id || shown.stale);

  const [rawPlacement, setPlacement] = useState<Placement>(() => clampPlacement(lastForVersion?.placement ?? null, sel.printArea));
  // always within the current product's print area (also after switching kippah)
  const placement = clampPlacement(rawPlacement, sel.printArea);
  const [finish, setFinish] = useState<'print' | 'embroidery'>(p.project.finish && sel.finishes.includes(p.project.finish) ? p.project.finish : sel.finishes[0]);
  const [confirmAi, setConfirmAi] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; orig: Placement } | null>(null);


  const area = sel.printArea;
  const canMock = sel.imageStatus === 'ok' && !!sel.image;
  const status = selectionStatusText(sel);
  const includedAvailable = version && !version.includedAiMockupUsed;
  const aspect = version ? version.logo.height / version.logo.width : 1;

  const production = useMemo(() => {
    if (!version || !sel.maxPrintWidthMm) return null;
    const mm = (sel.maxPrintWidthMm * placement.w) / area.maxW;
    const dpi = Math.floor((version.logo.width / (mm / 25.4)) * Math.min(1, version.logo.rasterScale || 1));
    return { w: Math.round(mm), h: Math.round(mm * aspect), dpi };
  }, [version, sel.maxPrintWidthMm, placement.w, area.maxW, aspect]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, orig: placement };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!d || !rect || d.id !== e.pointerId) return;
    setPlacement(clampPlacement({ ...d.orig, x: d.orig.x + (e.clientX - d.startX) / rect.width, y: d.orig.y + (e.clientY - d.startY) / rect.height }, area));
  }
  function onPointerUp() { drag.current = null; }

  if (!version) return <div className={s.card}>צרו קודם לוגו.</div>;

  return (
    <div className={s.twoCol}>
      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>מיקום וגודל — {sel.side === 'bottom' ? 'צד תחתון (פנים הכיפה)' : 'צד עליון'}</p>
          {!canMock && (
            <>
              <div className={status.kind === 'error' ? s.error : s.warn}>{status.text}</div>
              <button type="button" className={s.secondary} onClick={p.onBackToKippah}>לבחירת הכיפה והצבע</button>
            </>
          )}
          {canMock && sel.image && (
            <>
              <div ref={stageRef} className={s.mockStage} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                <img src={optimizeCloudinaryUrl(sel.image.url, 800)} alt="הכיפה שנבחרה" draggable={false} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 12 }} />
                <div className={s.area} style={{ left: `${(area.cx - area.maxShift) * 100}%`, top: `${(area.cy - area.maxShift) * 100}%`, width: `${area.maxShift * 200}%`, height: `${area.maxShift * 200}%` }} />
                <div className={s.overlay} role="slider" aria-label="גרירת הלוגו" aria-valuenow={Math.round(placement.x * 100)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`מיקום ${Math.round(placement.x * 100)}, ${Math.round(placement.y * 100)}`}
                  tabIndex={0}
                  onKeyDown={e => {
                    const step = 0.01;
                    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                    if (m[e.key]) { e.preventDefault(); setPlacement(clampPlacement({ ...placement, x: placement.x + m[e.key][0], y: placement.y + m[e.key][1] }, area)); }
                  }}
                  onPointerDown={onPointerDown}
                  style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.w * 100}%` }}>
                  <img src={version.logo.thumb} alt="" />
                </div>
              </div>
              <label className={s.label} htmlFor="ls-size">גודל הלוגו</label>
              <input id="ls-size" type="range" min={area.minW} max={area.maxW} step={0.005} value={placement.w}
                onChange={e => setPlacement(clampPlacement({ ...placement, w: Number(e.target.value) }, area))} style={{ width: '100%' }} />
              <div className={s.hint}>גררו את הלוגו בתוך האזור המסומן. השינוי כאן מקומי ולא צורך ניסיון.</div>
              {production
                ? <div className={s.hint}>גודל הדפסה מתוכנן: כ-{production.w}×{production.h} מ״מ · רזולוציה אפקטיבית {production.dpi} DPI</div>
                : <div className={s.hint}>מידות ההדפסה המדויקות ייקבעו על ידי הצוות שלנו.</div>}

              {sel.finishes.length > 1 && (
                <>
                  <span className={s.label}>גימור</span>
                  <div className={s.chips}>
                    {sel.finishes.map(f => <button key={f} type="button" className={s.chip} data-active={finish === f} onClick={() => setFinish(f)}>{f === 'print' ? 'הדפסה' : 'רקמה'}</button>)}
                  </div>
                </>
              )}
              <div className={s.row} style={{ marginTop: 12 }}>
                <button type="button" className={s.primary} disabled={!!p.busy} onClick={() => p.onCompose(placement, finish)}>
                  {p.busy === 'mockup' ? <span className={s.spinner} /> : 'הצג הדמיה (ללא ניסיון)'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>ההדמיה</p>
          {!shown && <div className={s.hint}>עדיין לא נוצרה הדמיה. מקמו את הלוגו ולחצו „הצג הדמיה”.</div>}
          {shown && (
            <div className={s.canvasWrap}>
              <img src={shown.thumb} alt="הדמיה על הכיפה" className={s.logoImg} />
              {shownOutdated && (
                <div className={s.stale}>
                  {shown.stale ? 'ההדמיה נוצרה על כיפה או צבע אחרים ואינה מעודכנת.' : `ההדמיה שייכת לגרסה ${shownVersion?.n ?? 'קודמת'} של הלוגו ואינה מעודכנת.`}
                </div>
              )}
            </div>
          )}
          <p className={s.disclaimer}>{MOCKUP_DISCLAIMER}</p>
          {versionMockups.length > 1 && (
            <div className={s.versions}>
              {versionMockups.map(m => (
                <button key={m.id} type="button" className={s.versionTile} data-active={shown?.id === m.id} onClick={() => p.onSelectMockup(m.id)}>
                  <img src={m.thumb} alt="" />
                  <div className={s.versionLabel}>{m.kind === 'ai' ? 'מציאותית' : 'הדמיה'}</div>
                </button>
              ))}
            </div>
          )}
          {canMock && lastForVersion && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className={s.secondary} style={{ width: '100%' }} disabled={!!p.busy || (!includedAvailable && p.blocked)}
                onClick={() => (includedAvailable ? p.onAiMockup(placement, finish, false) : setConfirmAi(true))}>
                {p.busy === 'aiMockup' ? <span className={`${s.spinner} ${s.spinnerDark}`} /> : includedAvailable ? '✨ הדמיה מציאותית ב-AI (כלולה בגרסה זו)' : '✨ הדמיה מציאותית נוספת (ניסיון 1)'}
              </button>
              <div className={s.hint}>ההדמיה המציאותית נבדקת אוטומטית שהלוגו לא השתנה. אם השתנה — היא נפסלת ולא נוצל ניסיון.</div>
            </div>
          )}
        </div>
      </div>

      {confirmAi && (
        <div className={s.modalBack} role="dialog" aria-modal="true" onClick={() => setConfirmAi(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <p className={s.cardTitle}>הדמיה נוספת תצרוך ניסיון</p>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>ההדמיה המציאותית הכלולה בגרסה זו כבר נוצלה. יצירה נוספת תצרוך ניסיון עיצוב אחד (נותרו {p.quota?.remaining ?? 0}). שינוי מיקום וגודל בהדמיה הרגילה — חינם.</p>
            <div className={s.row}>
              <button type="button" className={s.primary} style={{ flex: 1 }} disabled={(p.quota?.remaining ?? 0) < 1} onClick={() => { setConfirmAi(false); p.onAiMockup(placement, finish, true); }}>אישור — צור הדמיה</button>
              <button type="button" className={s.secondary} onClick={() => setConfirmAi(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      <div className={s.sticky}>
        <div className={s.stickyInner}>
          <button type="button" className={s.primary} disabled={!lastForVersion || !!p.busy} onClick={p.onNext}>
            {lastForVersion ? 'לאישור ושמירה להזמנה ←' : 'צרו הדמיה לגרסה הנוכחית כדי להמשיך'}
          </button>
        </div>
      </div>
    </div>
  );
}
