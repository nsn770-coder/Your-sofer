'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  CRM_STATUSES, CRM_SOURCES, CRM_STATUS_COLORS, CRM_SOURCE_COLORS, normalizePhone,
  AI_TEMPS, AI_TEMP_COLORS,
  type CrmStatus, type CrmSource, type CrmNote, type AiTemp,
} from '@/lib/crm';

const navy = '#1E3A8A';
const gold = '#C5A028';

const quickBtnStyle: React.CSSProperties = {
  background: '#eef2f7', color: navy, border: 'none', borderRadius: 6,
  padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmLeadRow {
  id: string;
  phone: string;
  name?: string | null;
  source: CrmSource;
  sourceDetail?: string | null;
  status: CrmStatus;
  saleStage?: string | null;
  notes?: CrmNote[];
  followUpAt?: number | null;
  assignedTo?: string | null;
  createdAt?: unknown;
  lastContactAt?: unknown;
  aiTemp?: AiTemp | null;
  aiIntent?: string | null;
  needsHuman?: boolean;
  aiUpdatedAt?: unknown;
}

interface OrderRow {
  id: string;
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  total?: number;
  status?: string;
  createdAt?: unknown;
}

interface WaMessage {
  role: 'user' | 'assistant' | 'admin';
  ts: number;
}

interface WaConversation {
  id: string;
  messages?: WaMessage[];
}

const STALE_NEW_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (typeof (ts as any)?.toDate === 'function') return (ts as any).toDate();
  if (ts instanceof Date) return ts;
  if (typeof (ts as any)?.seconds === 'number') return new Date((ts as any).seconds * 1000);
  if (typeof ts === 'number') return new Date(ts);
  return null;
}

function fmtDate(ts: unknown): string {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(ts: unknown): string {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} שניות`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} דקות`;
  const hr = Math.round(min / 60);
  return `${hr} שעות`;
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── New Lead Modal ───────────────────────────────────────────────────────────

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<CrmSource>('אחר');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };

  async function handleCreate() {
    const digits = phone.replace(/\D/g, '');
    if (!digits) { setError('יש להזין מספר טלפון'); return; }
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, 'crmLeads', digits);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setError('כבר קיים ליד עם מספר טלפון זה');
        setSaving(false);
        return;
      }
      await setDoc(ref, {
        phone,
        name: name || null,
        source,
        status: 'חדש',
        saleStage: null,
        notes: [],
        followUpAt: null,
        assignedTo: null,
        createdAt: new Date(),
        lastContactAt: new Date(),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError('שגיאה ביצירת הליד: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380, direction: 'rtl' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: navy, margin: '0 0 16px' }}>➕ ליד חדש</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>שם</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="שם הלקוח" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>טלפון</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="050-1234567" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>מקור</label>
            <select value={source} onChange={(e) => setSource(e.target.value as CrmSource)} style={inputStyle}>
              {CRM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error && <div style={{ color: '#e11d48', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' }}>
            ביטול
          </button>
          <button onClick={handleCreate} disabled={saving}
            style={{ background: navy, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'יוצר...' : 'צור ליד'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({
  lead, orders, onClose, onUpdate,
}: {
  lead: CrmLeadRow;
  orders: OrderRow[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<CrmLeadRow>) => void;
}) {
  const [noteText, setNoteText] = useState('');
  const [name, setName] = useState(lead.name ?? '');
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? '');
  const [followUpAt, setFollowUpAt] = useState(lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const linkedOrders = useMemo(
    () => orders.filter((o) => o.phone && normalizePhone(o.phone) === normalizePhone(lead.phone)),
    [orders, lead.phone],
  );

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' };

  async function saveDetails() {
    setSaving(true);
    try {
      const patch: Partial<CrmLeadRow> = {
        name: name || null,
        assignedTo: assignedTo || null,
        followUpAt: followUpAt ? new Date(followUpAt).getTime() : null,
      };
      await updateDoc(doc(db, 'crmLeads', lead.id), patch as any);
      onUpdate(lead.id, patch);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function setFollowUpQuick(daysFromNow: number) {
    const target = new Date(Date.now() + daysFromNow * DAY_MS);
    setFollowUpAt(target.toISOString().slice(0, 10));
    try {
      await updateDoc(doc(db, 'crmLeads', lead.id), { followUpAt: target.getTime() });
      onUpdate(lead.id, { followUpAt: target.getTime() });
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון תזכורת');
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const newNote: CrmNote = { text: noteText.trim(), ts: Date.now() };
    const updatedNotes = [...(lead.notes ?? []), newNote];
    try {
      await updateDoc(doc(db, 'crmLeads', lead.id), { notes: updatedNotes });
      onUpdate(lead.id, { notes: updatedNotes });
      setNoteText('');
    } catch (e) {
      console.error(e);
      alert('שגיאה בהוספת הערה');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 520, maxHeight: '85vh', overflowY: 'auto', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: navy, margin: 0 }}>👤 כרטיס לקוח</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>×</button>
        </div>

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>שם</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>טלפון</label>
            <input value={lead.phone} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#888' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>מקור</label>
            <div style={{ ...inputStyle, background: '#f5f5f5', color: CRM_SOURCE_COLORS[lead.source] ?? '#333', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: CRM_SOURCE_COLORS[lead.source] ?? '#ccc' }} />
              {lead.source}
              {lead.sourceDetail && <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>— {lead.sourceDetail}</span>}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>אחראי/ת</label>
            <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={inputStyle} placeholder="שם נציג" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>תזכורת למעקב</label>
            <input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {(lead.aiTemp || lead.aiIntent) && (
          <div style={{ background: '#f9fafb', border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: lead.aiIntent ? 6 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>🤖 ניתוח AI:</span>
              {lead.aiTemp && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 5, padding: '3px 9px', background: AI_TEMP_COLORS[lead.aiTemp] ?? '#9ca3af' }}>
                  {lead.aiTemp}
                </span>
              )}
              {lead.needsHuman && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 5, padding: '3px 9px', background: '#dc2626' }}>
                  🔥 דורש טיפול אנושי
                </span>
              )}
            </div>
            {lead.aiIntent && <div style={{ fontSize: 13, color: '#333' }}>{lead.aiIntent}</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => setFollowUpQuick(1)} style={quickBtnStyle}>מחר</button>
          <button onClick={() => setFollowUpQuick(3)} style={quickBtnStyle}>עוד 3 ימים</button>
          <button onClick={() => setFollowUpQuick(7)} style={quickBtnStyle}>שבוע</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={saveDetails} disabled={saving}
            style={{ background: navy, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'שומר...' : 'שמור פרטים'}
          </button>
          <a href={`/admin/whatsapp?phone=${encodeURIComponent(lead.id)}`}
            style={{ background: '#25D366', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            💬 פתח שיחת WhatsApp
          </a>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 8 }}>📝 הערות</h3>
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, marginBottom: 8 }}>
            {(lead.notes ?? []).length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, color: '#999' }}>אין הערות עדיין</div>
            ) : (
              [...(lead.notes ?? [])].reverse().map((n, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ fontSize: 10, color: '#999' }}>{fmtDate(n.ts)}</div>
                  <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap' }}>{n.text}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
              placeholder="הוסף הערה..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addNote} style={{ background: gold, color: navy, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              הוסף
            </button>
          </div>
        </div>

        {/* Order history */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: navy, marginBottom: 8 }}>🛒 היסטוריית הזמנות ({linkedOrders.length})</h3>
          {linkedOrders.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999' }}>לא נמצאו הזמנות למספר טלפון זה</div>
          ) : (
            <div style={{ border: '1px solid #eee', borderRadius: 8 }}>
              {linkedOrders.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f2f2f2', fontSize: 13 }}>
                  <span>#{o.orderNumber ?? o.id.slice(0, 6)}</span>
                  <span style={{ color: '#666' }}>{fmtDateShort(o.createdAt)}</span>
                  <span style={{ fontWeight: 700 }}>₪{o.total ?? 0}</span>
                  <span style={{ color: '#888' }}>{o.status ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard cards + pies ───────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function DistributionPie({
  title, data, colors,
}: {
  title: string;
  data: { name: string; count: number }[];
  colors: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: 320 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: navy, margin: '0 0 8px' }}>{title}</h3>
      {total === 0 ? (
        <div style={{ fontSize: 13, color: '#999', padding: '30px 0', textAlign: 'center' }}>אין נתונים עדיין</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ResponsiveContainer width="55%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                label={({ percent }: any) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                {data.map((d) => <Cell key={d.name} fill={colors[d.name] ?? '#ccc'} />)}
              </Pie>
              <Tooltip formatter={(val: any, name: any) => [`${val} לידים`, name] as [string, string]} />
            </PieChart>
          </ResponsiveContainer>
          {/* table-view fallback — direct labels so identity never rests on hue alone */}
          <div style={{ flex: 1, fontSize: 12.5 }}>
            {data.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[d.name] ?? '#ccc', flexShrink: 0 }} />
                <span style={{ color: '#333', flex: 1 }}>{d.name}</span>
                <span style={{ fontWeight: 700, color: navy }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({
  leadsByWeek, conversionBySource, botAvgResponseMs,
}: {
  leadsByWeek: { שבוע: string; לידים: number }[];
  conversionBySource: { source: CrmSource; total: number; closed: number; rate: number }[];
  botAvgResponseMs: number | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: navy, margin: '0 0 12px' }}>📈 לידים חדשים לפי שבוע (8 שבועות אחרונים)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={leadsByWeek} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="שבוע" tick={{ fontSize: 12, fill: '#666' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#666' }} width={30} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} labelStyle={{ direction: 'rtl' }} />
            <Bar dataKey="לידים" fill="#2a78d6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: navy, margin: '0 0 12px' }}>🎯 שיעור המרה לפי מקור (הפכו ל&quot;עסקה נסגרה&quot;)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversionBySource.map((c) => (
            <div key={c.source}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CRM_SOURCE_COLORS[c.source] }} />
                  {c.source}
                </span>
                <span style={{ fontWeight: 700, color: navy }}>{c.rate}% ({c.closed}/{c.total})</span>
              </div>
              <div style={{ background: '#f0f0f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${c.rate}%`, height: '100%', background: CRM_SOURCE_COLORS[c.source] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: navy, margin: '0 0 8px' }}>🤖 זמן תגובה ממוצע של הבוט</h3>
        {botAvgResponseMs === null ? (
          <div style={{ fontSize: 13, color: '#999' }}>אין עדיין מספיק נתונים</div>
        ) : (
          <div style={{ fontSize: 28, fontWeight: 900, color: '#2a78d6' }}>{fmtDuration(botAvgResponseMs)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<CrmLeadRow[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [conversations, setConversations] = useState<WaConversation[]>([]);

  const [pageTab, setPageTab] = useState<'leads' | 'reports'>('leads');

  const [statusFilter, setStatusFilter] = useState<string>('הכל');
  const [sourceFilter, setSourceFilter] = useState<string>('הכל');
  const [tempFilter, setTempFilter] = useState<string>('הכל');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const q = query(collection(db, 'crmLeads'), orderBy('lastContactAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: CrmLeadRow[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setLeads(list);
      setLeadsLoading(false);
    }, (err) => {
      console.error('[admin/crm] onSnapshot error', err);
      setLeadsLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDocs(collection(db, 'orders')).then((snap) => {
      const list: OrderRow[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setOrders(list);
    }).catch((e) => console.error('[admin/crm] load orders error', e));
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDocs(collection(db, 'whatsappConversations')).then((snap) => {
      const list: WaConversation[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setConversations(list);
    }).catch((e) => console.error('[admin/crm] load conversations error', e));
  }, [user]);

  // ── Dashboard stats (over ALL leads, not the filtered table) ────────────────

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return {
      total: leads.length,
      newThisWeek: leads.filter((l) => { const d = toDate(l.createdAt); return d && d.getTime() >= weekAgo; }).length,
      inProgress: leads.filter((l) => l.status === 'בטיפול').length,
      closed: leads.filter((l) => l.status === 'עסקה נסגרה').length,
    };
  }, [leads]);

  const statusData = useMemo(
    () => CRM_STATUSES.map((s) => ({ name: s, count: leads.filter((l) => l.status === s).length })).filter((d) => d.count > 0),
    [leads],
  );
  const sourceData = useMemo(
    () => CRM_SOURCES.map((s) => ({ name: s, count: leads.filter((l) => l.source === s).length })).filter((d) => d.count > 0),
    [leads],
  );

  // ── "המשימות שלי להיום" — follow-ups due or overdue ─────────────────────────

  const tasksDue = useMemo(
    () => leads
      .filter((l) => {
        const followUpDue = typeof l.followUpAt === 'number' && (l.followUpAt as number) <= Date.now();
        const isHot = l.needsHuman === true || l.aiTemp === 'חם';
        return followUpDue || isHot;
      })
      .sort((a, b) => {
        const aFU = typeof a.followUpAt === 'number' ? a.followUpAt : Infinity;
        const bFU = typeof b.followUpAt === 'number' ? b.followUpAt : Infinity;
        return aFU - bFU;
      }),
    [leads],
  );

  // ── Reports tab data ──────────────────────────────────────────────────────────

  const leadsByWeek = useMemo(() => {
    const weeks: { label: string; start: number; count: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 7; i >= 0; i--) {
      const start = now.getTime() - i * 7 * DAY_MS;
      const label = new Date(start).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
      weeks.push({ label, start, count: 0 });
    }
    for (const l of leads) {
      const d = toDate(l.createdAt);
      if (!d) continue;
      const t = d.getTime();
      for (let i = weeks.length - 1; i >= 0; i--) {
        if (t >= weeks[i].start) { weeks[i].count++; break; }
      }
    }
    return weeks.map((w) => ({ שבוע: w.label, לידים: w.count }));
  }, [leads]);

  const conversionBySource = useMemo(
    () => CRM_SOURCES.map((s) => {
      const total = leads.filter((l) => l.source === s).length;
      const closed = leads.filter((l) => l.source === s && l.status === 'עסקה נסגרה').length;
      return { source: s, total, closed, rate: total > 0 ? Math.round((closed / total) * 100) : 0 };
    }),
    [leads],
  );

  const botAvgResponseMs = useMemo(() => {
    const deltas: number[] = [];
    for (const c of conversations) {
      const msgs = c.messages ?? [];
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
          deltas.push(msgs[i + 1].ts - msgs[i].ts);
        }
      }
    }
    if (deltas.length === 0) return null;
    return deltas.reduce((s, d) => s + d, 0) / deltas.length;
  }, [conversations]);

  // ── Filtered table ───────────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== 'הכל' && l.status !== statusFilter) return false;
    if (sourceFilter !== 'הכל' && l.source !== sourceFilter) return false;
    if (tempFilter !== 'הכל' && (l.aiTemp ?? null) !== tempFilter) return false;
    if (dateFrom) {
      const d = toDate(l.createdAt);
      if (!d || d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = toDate(l.createdAt);
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (!d || d > end) return false;
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const matches = (l.name ?? '').toLowerCase().includes(q) || (l.phone ?? '').includes(q);
      if (!matches) return false;
    }
    return true;
  });

  function patchLead(id: string, patch: Partial<CrmLeadRow>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function updateField(id: string, field: keyof CrmLeadRow, value: string) {
    try {
      await updateDoc(doc(db, 'crmLeads', id), { [field]: value });
      patchLead(id, { [field]: value } as Partial<CrmLeadRow>);
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון');
    }
  }

  async function markTaskDone(id: string) {
    try {
      await updateDoc(doc(db, 'crmLeads', id), { followUpAt: null });
      patchLead(id, { followUpAt: null });
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון');
    }
  }

  async function postponeTaskTomorrow(id: string) {
    const target = Date.now() + DAY_MS;
    try {
      await updateDoc(doc(db, 'crmLeads', id), { followUpAt: target });
      patchLead(id, { followUpAt: target });
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון');
    }
  }

  function exportFilteredCsv() {
    const headers = ['שם', 'טלפון', 'מקור', 'סטטוס', 'שלב מכירה', 'אחראי', 'תאריך יצירה', 'פנייה אחרונה', 'תזכורת'];
    const rows = filteredLeads.map((l) => [
      l.name ?? '', l.phone, l.source, l.status, l.saleStage ?? '', l.assignedTo ?? '',
      fmtDateShort(l.createdAt), fmtDate(l.lastContactAt), l.followUpAt ? fmtDateShort(l.followUpAt) : '',
    ]);
    downloadCsv(`crm-leads-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>טוען...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', padding: '24px 20px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/admin" style={{ color: navy, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← חזרה לניהול</a>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: navy, margin: 0 }}>📇 CRM לקוחות</h1>
          </div>
          <button onClick={() => setShowNewLead(true)}
            style={{ background: navy, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ➕ ליד חדש
          </button>
        </div>

        {/* המשימות שלי להיום */}
        {tasksDue.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#b91c1c', margin: '0 0 10px' }}>
              🔔 המשימות שלי להיום ({tasksDue.length})
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {tasksDue.map((l) => {
                const followUpDue = typeof l.followUpAt === 'number' && (l.followUpAt as number) <= Date.now();
                const isHot = l.needsHuman === true || l.aiTemp === 'חם';
                const overdueDays = followUpDue ? Math.floor((Date.now() - (l.followUpAt as number)) / DAY_MS) : 0;
                return (
                  <div key={l.id} style={{ background: '#fff', border: '1px solid #fecaca', borderRight: '4px solid #e11d48', borderRadius: 10, padding: '12px 16px', minWidth: 240, boxShadow: '0 2px 6px rgba(0,0,0,.05)' }}>
                    <div style={{ fontWeight: 700, color: navy, fontSize: 14 }}>{l.name || l.phone}</div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{l.phone}</div>
                    {followUpDue && (
                      <div style={{ fontSize: 11, color: '#e11d48', fontWeight: 700, marginBottom: 6 }}>
                        {overdueDays > 0 ? `⏰ באיחור ${overdueDays} ימים` : '⏰ להיום'}
                      </div>
                    )}
                    {isHot && (
                      <div style={{ fontSize: 11, color: '#fff', background: '#dc2626', fontWeight: 700, borderRadius: 5, padding: '3px 8px', display: 'inline-block', marginBottom: 8 }}>
                        🔥 ליד חם — דורש טיפול
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a href={`/admin/whatsapp?phone=${encodeURIComponent(l.id)}`} style={{ ...quickBtnStyle, background: '#25D366', color: '#fff', textDecoration: 'none' }}>💬 וואטסאפ</a>
                      <a href={`tel:${l.phone}`} style={{ ...quickBtnStyle, background: '#eda100', color: '#fff', textDecoration: 'none' }}>📞 התקשר</a>
                      <button onClick={() => markTaskDone(l.id)} style={{ ...quickBtnStyle, background: '#008300', color: '#fff' }}>✔ בוצע</button>
                      <button onClick={() => postponeTaskTomorrow(l.id)} style={quickBtnStyle}>⏭ דחה למחר</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button onClick={() => setPageTab('leads')}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: pageTab === 'leads' ? navy : '#fff', color: pageTab === 'leads' ? '#fff' : '#666' }}>
            📋 ניהול לידים
          </button>
          <button onClick={() => setPageTab('reports')}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', background: pageTab === 'reports' ? navy : '#fff', color: pageTab === 'reports' ? '#fff' : '#666' }}>
            📊 דוחות
          </button>
        </div>

        {pageTab === 'reports' ? (
          <ReportsTab leadsByWeek={leadsByWeek} conversionBySource={conversionBySource} botAvgResponseMs={botAvgResponseMs} />
        ) : (
        <>

        {/* Dashboard */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <StatCard label="סה״כ לידים" value={stats.total} color={navy} />
          <StatCard label="חדשים השבוע" value={stats.newThisWeek} color="#2a78d6" />
          <StatCard label="בטיפול" value={stats.inProgress} color="#eda100" />
          <StatCard label="עסקאות שנסגרו" value={stats.closed} color="#008300" />
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <DistributionPie title="לידים לפי סטטוס" data={statusData} colors={CRM_STATUS_COLORS} />
          <DistributionPie title="לידים לפי מקור" data={sourceData} colors={CRM_SOURCE_COLORS} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>סטטוס</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="הכל">הכל</option>
              {CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>מקור</label>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={inputStyle}>
              <option value="הכל">הכל</option>
              {CRM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>🌡️ חום ליד</label>
            <select value={tempFilter} onChange={(e) => setTempFilter(e.target.value)} style={inputStyle}>
              <option value="הכל">הכל</option>
              {AI_TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>מתאריך</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>עד תאריך</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>חיפוש לפי שם / טלפון</label>
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="חיפוש..." />
          </div>
        </div>

        {/* Export */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={exportFilteredCsv}
            style={{ background: '#fff', color: navy, border: `1px solid ${navy}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ⬇ ייצוא CSV ({filteredLeads.length})
          </button>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f7f8fa', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>שם</th>
                <th style={{ padding: '10px 14px' }}>טלפון</th>
                <th style={{ padding: '10px 14px' }}>מקור</th>
                <th style={{ padding: '10px 14px' }}>סטטוס</th>
                <th style={{ padding: '10px 14px' }}>שלב מכירה</th>
                <th style={{ padding: '10px 14px' }}>🌡️ חום</th>
                <th style={{ padding: '10px 14px' }}>פנייה אחרונה</th>
                <th style={{ padding: '10px 14px' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#999' }}>טוען לידים...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#999' }}>לא נמצאו לידים</td></tr>
              ) : (
                filteredLeads.map((l) => {
                  const createdDate = toDate(l.createdAt);
                  const isStale = l.status === 'חדש' && createdDate !== null && Date.now() - createdDate.getTime() > STALE_NEW_MS;
                  return (
                  <tr key={l.id} style={{ borderTop: '1px solid #f0f0f0', background: isStale ? '#fffbeb' : undefined }}>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: navy }}>
                      {l.name || '—'}
                      {isStale && (
                        <span style={{ marginRight: 8, fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 5, padding: '2px 6px' }}>
                          ⏳ ממתין זמן רב
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 14px' }}>{l.phone}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CRM_SOURCE_COLORS[l.source] ?? '#ccc' }} />
                        {l.source}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <select value={l.status} onChange={(e) => updateField(l.id, 'status', e.target.value)}
                        style={{ ...inputStyle, padding: '4px 8px', fontSize: 12.5, color: CRM_STATUS_COLORS[l.status] ?? '#333', fontWeight: 700 }}>
                        {CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <input
                        defaultValue={l.saleStage ?? ''}
                        onBlur={(e) => { if (e.target.value !== (l.saleStage ?? '')) updateField(l.id, 'saleStage', e.target.value); }}
                        placeholder="—"
                        style={{ ...inputStyle, padding: '4px 8px', fontSize: 12.5, width: 120 }}
                      />
                    </td>
                    <td style={{ padding: '8px 14px' }} title={l.aiIntent ?? ''}>
                      {l.aiTemp && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 5, padding: '3px 9px',
                          background: AI_TEMP_COLORS[l.aiTemp] ?? '#9ca3af', whiteSpace: 'nowrap',
                        }}>
                          {l.aiTemp}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 14px', color: '#666', fontSize: 12 }}>{fmtDate(l.lastContactAt)}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <button onClick={() => setSelectedLeadId(l.id)}
                        style={{ background: '#eef6f0', color: navy, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        פתח כרטיס
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {selectedLead && (
        <LeadDetailModal lead={selectedLead} orders={orders} onClose={() => setSelectedLeadId(null)} onUpdate={patchLead} />
      )}
      {showNewLead && (
        <NewLeadModal onClose={() => setShowNewLead(false)} onCreated={() => {}} />
      )}
    </div>
  );
}
