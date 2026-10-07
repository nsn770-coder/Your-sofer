'use client';
import { useState } from 'react';
import s from '../LogoStudio.module.css';
import { studioApi, ApiError, type QuotaView } from '../studioApi';

export const EXHAUSTED_TEXT = 'ניצלת את 3 ניסיונות העיצוב בחינם. להמשך יצירה, הזן קוד שקיבלת מאיתנו.';

export function QuotaBadge({ quota, signedIn }: { quota: QuotaView | null; signedIn: boolean }) {
  if (!signedIn) {
    return <div className={s.quota}><span>🎁 3 ניסיונות עיצוב בחינם לכל לקוח</span><span className={s.src}>נדרשת התחברות לפני היצירה הראשונה</span></div>;
  }
  if (!quota) return null;
  return (
    <div className={s.quota} aria-live="polite">
      <span>ניסיונות עיצוב שנותרו: <span className={s.quotaNum}>{quota.remaining}</span></span>
      <span className={s.src}>יצירת לוגו או גרסה חדשה = ניסיון אחד · צפייה, שיחה ובחירה — חינם</span>
    </div>
  );
}

export function CodeRedeem({ onRedeemed, whatsapp, exhausted }: { onRedeemed: (q: QuotaView, msg: string) => void; whatsapp: string | null; exhausted: boolean }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await studioApi.redeem(code);
      setOk(r.message); setCode('');
      onRedeemed(r.quota, r.message);
    } catch (e) {
      setErr(e instanceof ApiError ? e.messageHe ?? 'אימות הקוד נכשל.' : 'אימות הקוד נכשל.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.card} style={exhausted ? { borderColor: '#e3d6ec', background: '#FBF8FD' } : undefined}>
      {exhausted && <p style={{ fontWeight: 800, margin: '0 0 10px', lineHeight: 1.6 }}>{EXHAUSTED_TEXT}</p>}
      {!exhausted && <p className={s.cardTitle}>יש לך קוד להמשך עיצוב?</p>}
      <div className={s.row}>
        <input
          className={`${s.input} ${s.grow}`}
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="הזן קוד"
          autoComplete="one-time-code"
          dir="ltr"
          aria-label="קוד המשך"
          maxLength={40}
        />
        <button type="button" className={s.secondary} onClick={submit} disabled={busy || !code.trim()}>
          {busy ? <span className={`${s.spinner} ${s.spinnerDark}`} /> : 'אימות'}
        </button>
      </div>
      {err && <div className={s.error} role="alert">{err}</div>}
      {ok && <div className={s.ok}>{ok}</div>}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('שלום, אשמח לקבל קוד להמשך עיצוב לוגו לכיפה באתר')}`}
          target="_blank"
          rel="noopener noreferrer"
          className={s.ghost}
          style={{ display: 'inline-block', marginTop: 8 }}
        >
          💬 לפנייה אלינו בוואטסאפ לקבלת קוד
        </a>
      )}
    </div>
  );
}
