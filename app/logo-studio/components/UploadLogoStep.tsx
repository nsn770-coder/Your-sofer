'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from 'react';
import s from '../LogoStudio.module.css';
import type { VersionView } from '../studioApi';

interface Props {
  /** current project version when it is an uploaded logo, else null */
  current: VersionView | null;
  signedIn: boolean;
  busy: null | 'uploadLogo' | 'bg';
  error: string | null;
  onRequireSignIn: () => void;
  onUpload: (file: File) => void;
  onSetBackground: (remove: boolean) => void;
}

/** Accepted input (before client-side shrinking): images up to 25MB. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Vercel request bodies are capped at ~4.5MB — stay safely below it. */
const MAX_SEND_BYTES = 4 * 1024 * 1024;

/**
 * Large photos / logos are shrunk in the browser (max 3000px, transparency
 * kept) so the upload stays under the hosting limit. Small files go as-is.
 */
export async function prepareLogoFile(f: File): Promise<File> {
  if (f.size <= MAX_SEND_BYTES) return f;
  const bmp = await createImageBitmap(f);
  for (const maxSide of [3000, 2400, 1800]) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    for (const [type, q] of [['image/png', undefined], ['image/webp', 0.95]] as const) {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, q));
      if (blob && blob.size <= MAX_SEND_BYTES && blob.type === type) {
        return new File([blob], f.name.replace(/\.[a-z0-9]+$/i, '') + (type === 'image/png' ? '.png' : '.webp'), { type });
      }
    }
  }
  throw new Error('too_large');
}

export default function UploadLogoStep(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [bg, setBg] = useState<'checker' | 'dark'>('checker');
  const up = p.current?.upload ?? null;

  function pick() {
    if (!p.signedIn) { p.onRequireSignIn(); return; }
    fileRef.current?.click();
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    setLocalErr(null);
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { setLocalErr('אפשר להעלות קובץ תמונה מסוג PNG, JPG או WEBP. קובץ PDF / AI — שלחו לנו בוואטסאפ.'); return; }
    if (f.size > MAX_INPUT_BYTES) { setLocalErr('הקובץ גדול מדי (עד 25MB).'); return; }
    p.onUpload(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className={s.twoCol}>
      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>⬆️ העלאת הלוגו שלכם</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => onFile(e.target.files?.[0])} />
          <div
            className={s.dropZone} data-drag={drag} role="button" tabIndex={0}
            onClick={pick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); if (!p.signedIn) { p.onRequireSignIn(); return; } onFile(e.dataTransfer.files?.[0]); }}
          >
            {p.busy === 'uploadLogo'
              ? <><span className={`${s.spinner} ${s.spinnerDark}`} /> <b>מעלים את הלוגו…</b></>
              : <>
                  <div style={{ fontSize: 30 }}>🖼️</div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#51285F', marginTop: 4 }}>{up ? 'החלפת קובץ הלוגו' : 'לחצו לבחירת קובץ הלוגו'}</div>
                  <div className={s.hint}>PNG, JPG או WEBP · עדיף PNG עם רקע שקוף ובאיכות גבוהה</div>
                </>}
          </div>
          {!p.signedIn && <div className={s.hint}>מכינים את הסטודיו…</div>}
          {(localErr || p.error) && <div className={s.error} role="alert">{localErr || p.error}</div>}

          {up && (
            <div style={{ marginTop: 14 }}>
              <span className={s.label}>הסרת רקע</span>
              {up.bgRemoved ? (
                <button type="button" className={s.bgBtn} disabled={!!p.busy} onClick={() => p.onSetBackground(false)}>
                  {p.busy === 'bg' ? <span className={`${s.spinner} ${s.spinnerDark}`} /> : '↩️ ביטול הסרת הרקע (חזרה לקובץ המקורי)'}
                </button>
              ) : (
                <button type="button" className={s.bgBtn} disabled={!!p.busy} onClick={() => p.onSetBackground(true)}>
                  {p.busy === 'bg' ? <><span className={`${s.spinner} ${s.spinnerDark}`} /> מסירים את הרקע…</> : '✂️ הסרת רקע מהלוגו'}
                </button>
              )}
              <div className={s.hint}>
                {up.bgRemoved
                  ? 'הרקע הוסר — בדקו את התוצאה גם על הרקע הכהה. הקובץ המקורי נשמר אצלנו.'
                  : 'יש ללוגו רקע לבן או צבעוני? לחצו להסרתו, כדי שרק הלוגו יודפס על הכיפה. אם הרקע כבר שקוף — אין צורך.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className={s.card} style={{ position: 'sticky', top: 70 }}>
          <div className={s.row} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <p className={s.cardTitle} style={{ margin: 0 }}>הלוגו שלכם</p>
            {up && (
              <div className={s.chips}>
                <button type="button" className={s.chip} data-active={bg === 'checker'} onClick={() => setBg('checker')}>רקע בהיר</button>
                <button type="button" className={s.chip} data-active={bg === 'dark'} onClick={() => setBg('dark')}>רקע כהה</button>
              </div>
            )}
          </div>
          {p.current && up ? (
            <>
              <div className={`${s.canvasWrap} ${bg === 'dark' ? s.dark : s.checker}`}>
                <img className={s.logoImg} src={p.current.logo.thumb} alt="הלוגו שהעליתם" />
              </div>
              <div className={s.hint}>{p.current.logo.width}×{p.current.logo.height} פיקסלים{up.bgRemoved ? ' · הרקע הוסר' : ''}. הרקע המשובץ רק ממחיש שקיפות.</div>
              {p.current.warnings.map((w, i) => <div key={i} className={s.warn}>{w}</div>)}
            </>
          ) : (
            <div className={`${s.preview} ${s.checker}`} style={{ color: '#9a8f7a', fontSize: 13 }}>כאן תופיע תצוגת הלוגו אחרי ההעלאה</div>
          )}
        </div>
      </div>
    </div>
  );
}
