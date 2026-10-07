'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import s from '../LogoStudio.module.css';
import type { ProjectView, QuotaView, VersionView, MessageView } from '../studioApi';

interface Props {
  project: ProjectView;
  quota: QuotaView | null;
  busy: null | 'generate' | 'chat' | 'select';
  onSelectVersion: (id: string) => void;
  onSendChat: (text: string) => Promise<void>;
  onApplyProposal: (p: NonNullable<MessageView['proposal']>) => void;
  onEditDetails: () => void;
  onNext: () => void;
  blocked: boolean;
}

const SUGGESTIONS = ['תעשה את הצבע מעט כהה יותר', 'תגדיל את האותיות', 'תוריד את העיטור', 'שים מגן דוד מעל האותיות', 'תשאיר הכול ורק תשנה את השם ל…'];

export default function DesignStep(p: Props) {
  const [bg, setBg] = useState<'checker' | 'dark'>('checker');
  const [text, setText] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const current: VersionView | undefined = p.project.versions.find(v => v.id === p.project.currentVersionId) ?? p.project.versions[0];

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [p.project.messages.length]);

  if (!current) {
    return <div className={s.card}><p>עדיין לא נוצר לוגו. חזרו לשלב הקודם כדי ליצור אותו.</p><button className={s.secondary} onClick={p.onEditDetails}>לפרטי הלוגו</button></div>;
  }

  // The most recent proposal that is still actionable (based on the selected version)
  const lastProposalMsg = [...p.project.messages].reverse().find(m => m.proposal);
  const generatedAfter = lastProposalMsg && p.project.versions.some(v => v.createdAt > lastProposalMsg.createdAt);
  const activeProposal = lastProposalMsg?.proposal && !generatedAfter && lastProposalMsg.proposal.baseVersionId === current.id ? lastProposalMsg.proposal : null;

  async function send(msg?: string) {
    const t = (msg ?? text).trim();
    if (!t || p.busy) return;
    if (t.endsWith('…')) { setText(t.replace(/…$/, ' ')); return; }
    setText('');
    await p.onSendChat(t);
  }

  return (
    <div className={s.twoCol}>
      <div>
        <div className={s.card}>
          <div className={s.row} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <p className={s.cardTitle} style={{ margin: 0 }}>גרסה {current.n}{p.project.approval?.versionId === current.id ? ' · ✓ אושרה' : ''}</p>
            <div className={s.chips}>
              <button type="button" className={s.chip} data-active={bg === 'checker'} onClick={() => setBg('checker')}>רקע בהיר</button>
              <button type="button" className={s.chip} data-active={bg === 'dark'} onClick={() => setBg('dark')}>רקע כהה</button>
            </div>
          </div>
          <div className={`${s.canvasWrap} ${bg === 'dark' ? s.dark : s.checker}`}>
            <img className={s.logoImg} src={current.logo.thumb} alt={`לוגו גרסה ${current.n}`} />
            {p.busy === 'generate' && <div className={s.stale} style={{ color: '#51285F' }}><span className={`${s.spinner} ${s.spinnerDark}`} />&nbsp; יוצרים גרסה חדשה…</div>}
          </div>
          <div className={s.hint}>הרקע המשובץ הוא רק להמחשת השקיפות — הקובץ עצמו שקוף. {current.logo.width}×{current.logo.height} פיקסלים.</div>
          {current.warnings.map((w, i) => <div key={i} className={s.warn}>{w}</div>)}
          <div className={s.row} style={{ marginTop: 8 }}>
            <a className={s.secondary} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={current.logo.url} target="_blank" rel="noopener noreferrer">⬇️ הורדת PNG</a>
            <button type="button" className={s.secondary} onClick={p.onEditDetails}>✏️ עריכת הפרטים</button>
          </div>
        </div>

        <div className={s.card}>
          <p className={s.cardTitle}>היסטוריית גרסאות</p>
          <div className={s.versions}>
            {p.project.versions.map(v => (
              <button key={v.id} type="button" className={s.versionTile} data-active={v.id === current.id} onClick={() => v.id !== current.id && p.onSelectVersion(v.id)} disabled={!!p.busy} title={v.summary.join(' · ')}>
                <img src={v.logo.thumb} alt="" className={s.checker} />
                <div className={s.versionLabel}>גרסה {v.n}{p.project.approval?.versionId === v.id ? ' ✓' : ''}</div>
              </button>
            ))}
          </div>
          <div className={s.hint}>{current.summary.join(' · ')}</div>
          <div className={s.hint}>בחירה בגרסה קודמת לא צורכת ניסיון. תיקונים הבאים יתבססו על הגרסה שנבחרה.</div>
        </div>
      </div>

      <div>
        <div className={s.card}>
          <p className={s.cardTitle}>💬 בקשת תיקונים</p>
          <div className={s.chat} ref={chatRef} aria-live="polite">
            {p.project.messages.length === 0 && <div className={s.hint}>כתבו מה לשנות — למשל „תעשה את הצבע מעט כהה יותר”. שיחה ושאלות לא צורכות ניסיון.</div>}
            {p.project.messages.map(m => (
              <div key={m.id} className={`${s.msg} ${m.role === 'user' ? s.msgUser : s.msgBot}`}>{m.text}</div>
            ))}
            {p.busy === 'chat' && <div className={`${s.msg} ${s.msgBot}`}><span className={`${s.spinner} ${s.spinnerDark}`} /></div>}
          </div>

          {activeProposal && (
            <div className={s.proposal}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>השינויים המוצעים לגרסה {current.n}:</div>
              <div style={{ fontSize: 13 }}>{activeProposal.summary.join(' · ')}</div>
              {activeProposal.newAiGraphic && <div className={s.hint}>כולל עיטור חדש שייווצר ב-AI.</div>}
              <button type="button" className={s.primary} style={{ marginTop: 8, minHeight: 46 }} disabled={!!p.busy || p.blocked} onClick={() => p.onApplyProposal(activeProposal)}>
                {p.busy === 'generate' ? <span className={s.spinner} /> : `צור גרסה חדשה (ניסיון 1 · נותרו ${p.quota?.remaining ?? 0})`}
              </button>
            </div>
          )}

          <div className={s.suggest}>
            {SUGGESTIONS.map(sg => <button key={sg} type="button" onClick={() => (sg.endsWith('…') ? setText(sg.replace('…', ' ')) : send(sg))} disabled={!!p.busy}>{sg}</button>)}
          </div>
          <div className={s.chatInput}>
            <input className={`${s.input} ${s.grow}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="מה לשנות בלוגו?" maxLength={400} dir="auto" aria-label="בקשת תיקון" />
            <button type="button" className={s.secondary} onClick={() => send()} disabled={!!p.busy || !text.trim()}>שליחה</button>
          </div>
        </div>
      </div>

      <div className={s.sticky}>
        <div className={s.stickyInner}>
          <button type="button" className={s.primary} disabled={!!p.busy} onClick={p.onNext}>הלוגו מוכן — להדמיה על הכיפה ←</button>
        </div>
      </div>
    </div>
  );
}
