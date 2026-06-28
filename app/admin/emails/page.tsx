'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, query, orderBy, doc, updateDoc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getEligibleRecipients, type NewsletterRecipient } from '@/lib/getEligibleRecipients';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  updatedAt?: { seconds: number } | Date;
}

type ContactRow = NewsletterRecipient;

interface SentEmail {
  id: string;
  to: string[];
  subject: string;
  bodyHtml?: string;
  sentAt?: { seconds: number } | Date;
  status: 'sent' | 'failed' | 'partial';
  templateId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_META: Record<string, { label: string }> = {
  order_confirmation:  { label: 'אישור הזמנה' },
  cart_abandonment:   { label: 'נטישת עגלה' },
  newsletter_welcome: { label: 'ברוך הבא / ניוזלטר' },
  custom_update:      { label: 'עדכון כללי ללקוח' },
};


const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyHtml: string; isActive: boolean }> = {
  order_confirmation: {
    subject: 'אישור הזמנה מ-YourSofer',
    bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E3A8A">
<h2 style="color:#C5A028">תודה על הזמנתך! ✡️</h2>
<p>שלום {{name}},</p>
<p>קיבלנו את הזמנתך מספר <strong>{{orderNumber}}</strong> בהצלחה.</p>
<p>סכום ההזמנה: <strong>{{total}}</strong></p>
<p>נעדכן אותך כשההזמנה תצא לדרך.</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
    isActive: true,
  },
  cart_abandonment: {
    subject: 'שכחת משהו בעגלה 🛒',
    bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E3A8A">
<h2 style="color:#C5A028">שכחת משהו... 🛒</h2>
<p>שלום {{name}},</p>
<p>ראינו שהשארת פריטים בעגלה שלך. חזור/י להשלים את הרכישה!</p>
<div style="text-align:center;margin:30px 0">
  <a href="https://your-sofer.com/cart" style="background:#C5A028;color:#1E3A8A;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold">המשך לעגלה →</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
    isActive: true,
  },
  newsletter_welcome: {
    subject: 'ברוך הבא ל-YourSofer! 🎉',
    bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E3A8A">
<h2 style="color:#C5A028">ברוך הבא ל-YourSofer! 🎉</h2>
<p>שלום {{name}},</p>
<p>אנחנו שמחים שהצטרפת! ב-YourSofer תמצא/י את מיטב הסופרים הסת"ם.</p>
<div style="text-align:center;margin:30px 0">
  <a href="https://your-sofer.com" style="background:#1E3A8A;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold">לחנות שלנו →</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
    isActive: true,
  },
  custom_update: {
    subject: 'עדכון מ-YourSofer',
    bodyHtml: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E3A8A">
<h2 style="color:#C5A028">עדכון חשוב מ-YourSofer</h2>
<p>שלום {{name}},</p>
<p>{{message}}</p>
<div style="text-align:center;margin:30px 0">
  <a href="https://your-sofer.com" style="background:#C5A028;color:#1E3A8A;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold">לאתר שלנו →</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
<p style="font-size:12px;color:#888">YourSofer — יודאיקה בסטנדרט הגבוה ביותר</p>
</div>`,
    isActive: true,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts?: { seconds: number } | Date | null): string {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : new Date((ts as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isEligible(c: ContactRow): boolean {
  return !!c.email && c.consent && !c.optOut;
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

function SendModal({
  selected,
  contacts,
  templates,
  onClose,
  onSent,
}: {
  selected: Set<string>;
  contacts: ContactRow[];
  templates: EmailTemplate[];
  onClose: () => void;
  onSent: () => void;
}) {
  const recipients = contacts.filter(c => selected.has(c.id) && isEligible(c));
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) { setSubject(t.subject); setBody(t.bodyHtml); }
  }

  async function handleSend() {
    if (!subject || !body) { alert('נושא וגוף הודעה הם שדות חובה'); return; }
    setSending(true);
    try {
      const auth = await getAuthLazy();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipients: recipients.map(c => c.email),
          subject,
          bodyHtml: body,
          templateId: templateId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`נשלח בהצלחה ל-${data.sent} נמענים${data.failed > 0 ? ` · ${data.failed} נכשלו` : ''}${(data.skipped ?? 0) > 0 ? ` · ${data.skipped} דילוגים (optOut)` : ''}`);
        setTimeout(() => { onSent(); onClose(); }, 2000);
      } else {
        setResult('שגיאה: ' + (data.error || 'unknown'));
      }
    } catch (e: any) {
      setResult('שגיאה: ' + e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', padding: 28, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>📧 שלח מייל לנבחרים</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        <div style={{ background: '#f0f4ff', border: '1px solid #c5d8ff', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          <strong>נמענים ({recipients.length}):</strong>{' '}
          {recipients.length === 0
            ? <span style={{ color: '#e53e3e' }}>אין נמענים זכאים נבחרים</span>
            : <span style={{ color: '#1E3A8A' }}>{recipients.map(c => c.email).join(', ')}</span>}
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>בחר תבנית (אופציונלי)</label>
            <select value={templateId} onChange={e => applyTemplate(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
              <option value="">— הודעה מותאמת אישית —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{TEMPLATE_META[t.id]?.label || t.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>נושא *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="נושא המייל..."
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>גוף הודעה (HTML) *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
              placeholder="<p>כתוב כאן את תוכן המייל...</p>"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
          </div>
        </div>

        {result && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: result.startsWith('נשלח') ? '#f0fdf4' : '#fef2f2', color: result.startsWith('נשלח') ? '#15803d' : '#dc2626', fontWeight: 700, fontSize: 14 }}>
            {result}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSend} disabled={sending || recipients.length === 0}
            style={{ flex: 1, background: recipients.length === 0 ? '#ccc' : '#1E3A8A', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: recipients.length === 0 ? 'not-allowed' : 'pointer' }}>
            {sending ? '⏳ שולח...' : `📤 שלח ל-${recipients.length} נמענים`}
          </button>
          <button onClick={onClose}
            style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Section = 'templates' | 'leads' | 'history';

export default function EmailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [section, setSection] = useState<Section>('templates');

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [templateEdits, setTemplateEdits] = useState<Record<string, { subject: string; bodyHtml: string; isActive: boolean }>>({});
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  // Contacts — newsletter-eligible leads only
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('הכל');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);

  // History
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);

  // ── Seed + load templates ──────────────────────────────────────────────────

  const seedTemplates = useCallback(async () => {
    for (const [id, data] of Object.entries(DEFAULT_TEMPLATES)) {
      const ref = doc(db, 'emailTemplates', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { ...data, updatedAt: serverTimestamp() });
      }
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      await seedTemplates();
      const snap = await getDocs(collection(db, 'emailTemplates'));
      const list: EmailTemplate[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EmailTemplate));
      list.sort((a, b) => Object.keys(TEMPLATE_META).indexOf(a.id) - Object.keys(TEMPLATE_META).indexOf(b.id));
      setTemplates(list);
      const edits: typeof templateEdits = {};
      list.forEach(t => { edits[t.id] = { subject: t.subject, bodyHtml: t.bodyHtml, isActive: t.isActive }; });
      setTemplateEdits(edits);
    } catch (e) { console.error(e); }
    finally { setTemplatesLoading(false); }
  }, [seedTemplates]);

  // ── Load contacts — delegates to getEligibleRecipients ───────────────────

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      setContacts(await getEligibleRecipients());
    } catch (e: any) {
      console.error('[loadContacts]', e);
      setContactsError('שגיאה בטעינת הרשימה — ' + (e?.message ?? 'נסה לרענן'));
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // ── Load history ───────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'sentEmails'), orderBy('sentAt', 'desc')));
      const list: SentEmail[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SentEmail));
      setSentEmails(list);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadTemplates();
      loadContacts();
    }
  }, [user, loadTemplates, loadContacts]);

  useEffect(() => {
    if (section === 'history' && user?.role === 'admin') loadHistory();
  }, [section, user, loadHistory]);

  // ── Template handlers ──────────────────────────────────────────────────────

  async function saveTemplate(id: string) {
    setSavingTemplate(id);
    try {
      const edits = templateEdits[id];
      await updateDoc(doc(db, 'emailTemplates', id), { ...edits, updatedAt: serverTimestamp() });
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...edits } : t));
      setExpandedTemplate(null);
    } catch (e) { alert('שגיאה בשמירה'); console.error(e); }
    finally { setSavingTemplate(null); }
  }

  // ── Contacts filter + selection ────────────────────────────────────────────
  // All records from getEligibleRecipients() are already consent+!optOut+email,
  // so every row in this list can be selected and sent to.

  const uniqueSources = ['הכל', ...Array.from(new Set(contacts.map(c => c.sourceLabel)))];

  const filteredContacts = contacts.filter(c => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || [c.name, c.email, c.phone].some(v => v?.toLowerCase().includes(q));
    const matchSrc = sourceFilter === 'הכל' || c.sourceLabel === sourceFilter;
    return matchQ && matchSrc;
  });

  const allSelected = filteredContacts.length > 0 && filteredContacts.every(c => selected.has(c.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) {
      filteredContacts.forEach(c => next.delete(c.id));
    } else {
      filteredContacts.forEach(c => next.add(c.id));
    }
    setSelected(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', padding: '24px 20px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <a href="/admin" style={{ color: '#1E3A8A', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← חזרה לניהול</a>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1E3A8A', margin: 0 }}>📧 ניהול מיילים</h1>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {([
            { key: 'templates', label: '📋 תבניות מיילים' },
            { key: 'leads',     label: `👥 רשימת תפוצה (${contacts.length})` },
            { key: 'history',   label: '📨 היסטוריית שליחות' },
          ] as { key: Section; label: string }[]).map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              style={{
                padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: section === s.key ? '#1E3A8A' : '#fff',
                color: section === s.key ? '#fff' : '#555',
                boxShadow: section === s.key ? '0 2px 8px rgba(30,58,138,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── SECTION 1: Templates ── */}
        {section === 'templates' && (
          <div>
            {templatesLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען תבניות...</div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {templates.map(t => {
                  const isExpanded = expandedTemplate === t.id;
                  const edits = templateEdits[t.id] ?? { subject: t.subject, bodyHtml: t.bodyHtml, isActive: t.isActive };
                  const updatedAt = t.updatedAt instanceof Date ? t.updatedAt : (t.updatedAt as { seconds: number } | undefined);
                  return (
                    <div key={t.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #eee' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: edits.isActive ? '#16a34a' : '#9ca3af' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 15 }}>{TEMPLATE_META[t.id]?.label || t.id}</div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                              <span style={{ fontFamily: 'monospace', marginLeft: 8, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{t.id}</span>
                              {updatedAt && typeof updatedAt !== 'undefined' && 'seconds' in (updatedAt as object)
                                ? `עודכן: ${fmtDate(updatedAt as { seconds: number })}`
                                : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: edits.isActive ? '#16a34a' : '#9ca3af', fontWeight: 700 }}>
                            {edits.isActive ? 'פעיל' : 'לא פעיל'}
                          </span>
                          <span style={{ fontSize: 18, color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '20px', display: 'grid', gap: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                              <input type="checkbox" checked={edits.isActive}
                                onChange={e => setTemplateEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], isActive: e.target.checked } }))}
                                style={{ width: 15, height: 15 }} />
                              תבנית פעילה
                            </label>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>נושא</label>
                            <input value={edits.subject}
                              onChange={e => setTemplateEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], subject: e.target.value } }))}
                              style={inputStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>גוף הודעה (HTML)</label>
                            <textarea value={edits.bodyHtml} rows={12}
                              onChange={e => setTemplateEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], bodyHtml: e.target.value } }))}
                              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => saveTemplate(t.id)} disabled={savingTemplate === t.id}
                              style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                              {savingTemplate === t.id ? '⏳ שומר...' : '💾 שמור תבנית'}
                            </button>
                            <button onClick={() => setExpandedTemplate(null)}
                              style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer' }}>
                              ביטול
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 2: Newsletter list ── */}
        {section === 'leads' && (
          <div>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'זכאים לשליחה', value: contacts.length, color: '#15803d' },
                { label: 'נבחרו כעת',    value: selected.size,   color: '#1E3A8A' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '10px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', minWidth: 110 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="חיפוש לפי שם / מייל / טלפון..."
                style={{ flex: 1, minWidth: 200, border: '1px solid #ddd', borderRadius: 8, padding: '9px 14px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}
              />
              <select
                value={sourceFilter}
                onChange={e => { setSourceFilter(e.target.value); setSelected(new Set()); }}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: '9px 14px', fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                {uniqueSources.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={loadContacts}
                style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#555' }}>
                🔄
              </button>
              {selected.size > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A', background: '#EFF4FF', padding: '6px 14px', borderRadius: 8 }}>
                  נבחרו {selected.size}
                </span>
              )}
              <button
                onClick={() => setShowSendModal(true)}
                disabled={selected.size === 0}
                style={{ background: selected.size === 0 ? '#e0e0e0' : '#1E3A8A', color: selected.size === 0 ? '#999' : '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: selected.size === 0 ? 'not-allowed' : 'pointer' }}>
                📤 שלח לנבחרים
              </button>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {contactsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען רשימת תפוצה...</div>
              ) : contactsError ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: 12 }}>⚠️ {contactsError}</div>
                  <button onClick={loadContacts} style={{ background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>נסה שוב</button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                  {contacts.length === 0 ? 'אין מנויים עם הסכמה ברשימת הדיוור עדיין' : 'לא נמצאו תוצאות לחיפוש זה'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555', width: 40 }}>
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} title="בחר את כל הזכאים" />
                        </th>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>מייל</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>שם</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>מקור</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>סטטוס</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>תאריך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((c, i) => (
                        <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0', background: selected.has(c.id) ? '#EFF4FF' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleOne(c.id)}
                              style={{ cursor: 'pointer', accentColor: '#1E3A8A' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#1E3A8A' }}>
                            {c.email}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#333' }}>{c.name || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: c.source === 'club' ? '#eff6ff' : c.source === 'mezuzah_funnel' ? '#fef9c3' : '#f3f4f6',
                              color: c.source === 'club' ? '#1d4ed8' : c.source === 'mezuzah_funnel' ? '#854d0e' : '#555',
                            }}>
                              {c.sourceLabel}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                              ✓ consent
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#888', fontSize: 11 }}>{fmtDate(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── SECTION 3: History ── */}
        {section === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: '#888' }}>היסטוריית כל המיילים שנשלחו</span>
              <button onClick={loadHistory} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#555' }}>
                🔄 רענן
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען...</div>
            ) : sentEmails.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#fff', borderRadius: 12 }}>אין מיילים שנשלחו עדיין</div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>נמענים</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>נושא</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>תבנית</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>תאריך</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#555' }}>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentEmails.map(e => (
                      <React.Fragment key={e.id}>
                        <tr
                          onClick={() => setExpandedEmail(expandedEmail === e.id ? null : e.id)}
                          style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer', background: expandedEmail === e.id ? '#f0f4ff' : 'transparent' }}>
                          <td style={{ padding: '11px 14px', color: '#555' }}>
                            {e.to?.length === 1 ? e.to[0] : `${e.to?.length ?? 0} נמענים`}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1E3A8A', maxWidth: 200 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#888', fontSize: 11 }}>
                            {e.templateId ? (TEMPLATE_META[e.templateId]?.label || e.templateId) : 'מותאם אישית'}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#888', fontSize: 11 }}>
                            {fmtDate(e.sentAt as { seconds: number } | Date | undefined)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: e.status === 'sent' ? '#dcfce7' : e.status === 'failed' ? '#fef2f2' : '#fff7ed',
                              color: e.status === 'sent' ? '#15803d' : e.status === 'failed' ? '#dc2626' : '#c2410c',
                            }}>
                              {e.status === 'sent' ? '✓ נשלח' : e.status === 'failed' ? '✕ נכשל' : '⚠ חלקי'}
                            </span>
                          </td>
                        </tr>
                        {expandedEmail === e.id && (
                          <tr>
                            <td colSpan={5} style={{ padding: '0 14px 14px' }}>
                              <div style={{ background: '#f9fafb', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 700 }}>נמענים:</div>
                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#333', marginBottom: 12, wordBreak: 'break-all' }}>
                                  {(e.to ?? []).join(', ')}
                                </div>
                                {e.bodyHtml && (
                                  <>
                                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 700 }}>תצוגה מקדימה:</div>
                                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff', maxHeight: 300, overflow: 'auto' }}
                                      dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showSendModal && (
        <SendModal
          selected={selected}
          contacts={contacts}
          templates={templates}
          onClose={() => setShowSendModal(false)}
          onSent={() => { setSelected(new Set()); loadHistory(); }}
        />
      )}
    </div>
  );
}
