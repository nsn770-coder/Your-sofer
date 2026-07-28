'use client';
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';

function Field({ label, value, onChange, type = 'text', placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, letterSpacing: 0.3 }}>
        {label}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: `1.5px solid ${focused ? '#C5A028' : '#E7E2D8'}`,
          borderRadius: 0, padding: '11px 14px', fontSize: 14,
          outline: 'none', fontFamily: 'inherit', background: '#fafaf9',
          transition: 'border-color 0.15s', color: '#1a1a1a',
        }}
      />
      {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // מלא טופס מנתוני המשתמש הקיימים
  useEffect(() => {
    if (!user) return;
    setForm({
      firstName:   user.firstName   || '',
      lastName:    user.lastName    || '',
      phone:       user.phone       || '',
      dateOfBirth: user.dateOfBirth || '',
    });
  }, [user]);

  if (!user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const updates = {
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        phone:       form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        // עדכן גם displayName אם שם הוזן
        ...(form.firstName.trim()
          ? { displayName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim() }
          : {}),
      };
      await updateDoc(doc(db, 'users', user.uid), updates);
      updateLocalUser(updates); // עדכן context מיידית ללא רענון
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[profile save]', err);
      setError('שגיאה בשמירה. אנא נסה שנית.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 300, color: '#1a1a1a', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
        הפרטים שלי
      </h2>

      {/* כרטיס פרטי חשבון Google */}
      <div style={{ background: '#fff', padding: '16px 20px', marginBottom: 24, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
        {user.photoURL && (
          <img src={user.photoURL} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #C5A028', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{user.displayName || '—'}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</div>
          <div style={{ fontSize: 11, color: '#C5A028', marginTop: 2 }}>מחובר עם Google</div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ background: '#fff', padding: '28px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px' }}>פרטים אישיים</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="שם פרטי" value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} placeholder="ישראל" />
            <Field label="שם משפחה" value={form.lastName} onChange={v => setForm(p => ({ ...p, lastName: v }))} placeholder="ישראלי" />
          </div>

          <Field label="טלפון" type="tel" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="050-0000000" />

          <Field
            label="תאריך לידה"
            type="date"
            value={form.dateOfBirth}
            onChange={v => setForm(p => ({ ...p, dateOfBirth: v }))}
            hint="🎁 הוסף תאריך לידה — בקרוב נפתיע אותך ביום הולדתך"
          />
        </div>

        {/* כפתור שמירה */}
        {error && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {saved && <div style={{ color: '#27ae60', fontSize: 13, marginBottom: 12 }}>✓ הפרטים נשמרו בהצלחה</div>}

        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? '#888' : '#1a1a1a', color: '#fff', border: 'none',
            padding: '12px 32px', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.2s',
          }}
        >
          {saving ? 'שומר...' : 'שמור פרטים'}
        </button>
      </form>
    </div>
  );
}
