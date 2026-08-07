'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvMessage {
  role: 'user' | 'assistant' | 'admin';
  content: string;
  ts: number;
  followup?: boolean;
}

interface Conversation {
  id: string;
  phone: string;
  messages: ConvMessage[];
  updatedAt?: { toDate?: () => Date; seconds?: number } | Date | null;
  botMuted?: boolean;
  botMutedUntil?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts: Conversation['updatedAt']): string {
  if (!ts) return '—';
  const d =
    typeof (ts as any)?.toDate === 'function'
      ? (ts as any).toDate()
      : ts instanceof Date
      ? ts
      : new Date(((ts as any).seconds ?? 0) * 1000);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('phone'));
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [followupEnabled, setFollowupEnabled] = useState(true);
  const [followupLoading, setFollowupLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDoc(doc(db, 'siteConfig', 'whatsapp'))
      .then((snap) => {
        setFollowupEnabled(snap.exists() ? snap.data()?.followupEnabled !== false : true);
      })
      .catch((e) => console.error('[admin/whatsapp] load followup config error', e))
      .finally(() => setFollowupLoading(false));
  }, [user]);

  async function toggleFollowup(next: boolean) {
    setFollowupEnabled(next);
    try {
      await setDoc(doc(db, 'siteConfig', 'whatsapp'), { followupEnabled: next }, { merge: true });
    } catch (e) {
      console.error('[admin/whatsapp] toggleFollowup error', e);
      alert('שגיאה בעדכון הגדרת הפולואפ');
      setFollowupEnabled(!next);
    }
  }

  // ── Live conversation list ─────────────────────────────────────────────────

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const q = query(collection(db, 'whatsappConversations'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Conversation[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setConversations(list);
        setConvsLoading(false);
      },
      (err) => {
        console.error('[admin/whatsapp] onSnapshot error', err);
        setConvsLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages?.length, selectedId]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function toggleMute(id: string, next: boolean) {
    try {
      await updateDoc(doc(db, 'whatsappConversations', id), { botMuted: next });
    } catch (e) {
      console.error('[admin/whatsapp] toggleMute error', e);
      alert('שגיאה בעדכון סטטוס הבוט');
    }
  }

  async function handleSend() {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      const auth = await getAuthLazy();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/whatsapp/admin-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: selectedId, message: replyText.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'unknown');
      setReplyText('');
    } catch (e: any) {
      alert('שגיאה בשליחה: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box',
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', padding: '24px 20px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/admin" style={{ color: 'var(--ys-heading)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← חזרה לניהול</a>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--ys-heading)', margin: 0 }}>💬 שיחות WhatsApp</h1>
          </div>
          {!followupLoading && (
            <button
              onClick={() => toggleFollowup(!followupEnabled)}
              title="הפעלה/כיבוי גלובלי של פולואפ אוטומטי לכל השיחות"
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700,
                background: followupEnabled ? '#e5e7eb' : '#e11d48',
                color: followupEnabled ? '#333' : '#fff',
              }}
            >
              {followupEnabled ? '⏰ פולואפ אוטומטי פעיל — לחץ לכיבוי' : '⏰ פולואפ אוטומטי כבוי — לחץ להפעלה'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 130px)' }}>

          {/* Conversation list */}
          <div style={{ width: 340, flexShrink: 0, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflowY: 'auto' }}>
            {convsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>טוען שיחות...</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>אין שיחות עדיין</div>
            ) : (
              conversations.map((c) => {
                const last = c.messages?.[c.messages.length - 1];
                const isMuted = c.botMuted || (!!c.botMutedUntil && c.botMutedUntil > Date.now());
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      background: selectedId === c.id ? '#eef6f0' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ys-heading)' }}>{c.phone || c.id}</span>
                      <span style={{ fontSize: 11, color: '#999' }}>{fmtDate(c.updatedAt)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#666', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {last?.content ?? '—'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{c.messages?.length ?? 0} הודעות</span>
                      {isMuted && <span style={{ fontSize: 11, color: '#e11d48', fontWeight: 700 }}>🔇 מושתק</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat panel */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
                בחר/י שיחה מהרשימה
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ys-heading)' }}>{selected.phone || selected.id}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {!selected.botMuted && selected.botMutedUntil && selected.botMutedUntil > Date.now() && (
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                        ⏱️ הושתק זמנית עד {new Date(selected.botMutedUntil).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <button
                      onClick={() => toggleMute(selected.id, !selected.botMuted)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 700,
                        background: selected.botMuted ? '#e11d48' : '#e5e7eb',
                        color: selected.botMuted ? '#fff' : '#333',
                      }}
                    >
                      {selected.botMuted ? '🔇 בוט מושתק — לחץ להפעלה' : '🔊 בוט פעיל — לחץ להשתקה'}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 18, background: '#f0f2f5' }}>
                  {(selected.messages ?? []).map((m, i) => {
                    const isUser = m.role === 'user';
                    return (
                      <div key={i} style={{ display: 'flex', marginBottom: 10 }}>
                        <div
                          style={{
                            maxWidth: '72%',
                            marginLeft: isUser ? 'auto' : 0,
                            marginRight: isUser ? 0 : 'auto',
                            background: isUser ? '#e5e7eb' : '#25D366',
                            color: isUser ? '#111' : '#fff',
                            borderRadius: 14,
                            padding: '9px 13px',
                          }}
                        >
                          {!isUser && (
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, opacity: 0.9 }}>
                              {m.role === 'admin' ? '👨 אדמין' : '🤖 בוט'}
                              {m.followup && ' · ⏰ פולואפ'}
                            </div>
                          )}
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.4 }}>{m.content}</div>
                          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, textAlign: isUser ? 'left' : 'right' }}>
                            {fmtTime(m.ts)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box */}
                <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #eee' }}>
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="הקלד/י תשובה ידנית..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                    style={{
                      background: sending || !replyText.trim() ? '#ccc' : 'var(--ys-heading)',
                      color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px',
                      fontSize: 14, fontWeight: 700, cursor: sending || !replyText.trim() ? 'default' : 'pointer',
                    }}
                  >
                    {sending ? 'שולח...' : 'שלח'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
