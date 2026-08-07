'use client';
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Address } from '@/app/contexts/AuthContext';

const EMPTY_ADDRESS: Omit<Address, 'id'> = {
  label: 'בית', firstName: '', lastName: '',
  street: '', city: '', zip: '', country: 'ישראל', phone: '',
};

function AddressCard({
  address, isDefaultShipping, isDefaultBilling,
  onEdit, onDelete, onSetShipping, onSetBilling,
}: {
  address: Address;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetShipping: () => void;
  onSetBilling: () => void;
}) {
  return (
    <div style={{ background: '#fff', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'relative', borderRight: isDefaultShipping ? '3px solid var(--ys-accent)' : '3px solid transparent' }}>
      {/* תגיות */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#F8F6F1', color: '#555', padding: '2px 8px' }}>{address.label}</span>
        {isDefaultShipping && <span style={{ fontSize: 11, background: 'var(--ys-accent)', color: '#fff', padding: '2px 8px', fontWeight: 700 }}>ברירת מחדל למשלוח</span>}
        {isDefaultBilling && <span style={{ fontSize: 11, background: 'var(--ys-dark-surface)', color: '#fff', padding: '2px 8px', fontWeight: 700 }}>ברירת מחדל לחיוב</span>}
      </div>

      {/* פרטי כתובת */}
      <div style={{ fontSize: 14, color: 'var(--ys-text)', fontWeight: 600, marginBottom: 2 }}>
        {address.firstName} {address.lastName}
      </div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
        {address.street}<br />
        {address.city}{address.zip ? `, ${address.zip}` : ''}<br />
        {address.country}
        {address.phone && <><br />{address.phone}</>}
      </div>

      {/* פעולות */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={{ fontSize: 12, color: 'var(--ys-text)', background: 'none', border: '1px solid #E7E2D8', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          ✏️ ערוך
        </button>
        {!isDefaultShipping && (
          <button onClick={onSetShipping} style={{ fontSize: 12, color: 'var(--ys-accent)', background: 'none', border: '1px solid var(--ys-accent)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            הגדר למשלוח
          </button>
        )}
        {!isDefaultBilling && (
          <button onClick={onSetBilling} style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid #ddd', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            הגדר לחיוב
          </button>
        )}
        <button onClick={onDelete} style={{ fontSize: 12, color: '#c0392b', background: 'none', border: 'none', padding: '5px 4px', cursor: 'pointer', fontFamily: 'inherit', marginRight: 'auto' }}>
          🗑️ מחק
        </button>
      </div>
    </div>
  );
}

function AddressForm({
  initial, onSave, onCancel,
}: {
  initial: Omit<Address, 'id'>;
  onSave: (data: Omit<Address, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Address, 'id'>>(initial);
  const f = (k: keyof Omit<Address, 'id'>) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  function InputField({ label, fieldKey, type = 'text', placeholder }: { label: string; fieldKey: keyof Omit<Address, 'id'>; type?: string; placeholder?: string }) {
    const [focused, setFocused] = useState(false);
    return (
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 }}>{label}</label>
        <input
          type={type} value={form[fieldKey] as string} placeholder={placeholder}
          onChange={e => f(fieldKey)(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${focused ? 'var(--ys-accent)' : '#E7E2D8'}`, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fafaf9', borderRadius: 0 }}
        />
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', color: 'var(--ys-text)' }}>
        {initial.street ? 'עריכת כתובת' : 'הוספת כתובת חדשה'}
      </h3>

      {/* תווית */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, display: 'block' }}>סוג כתובת</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['בית', 'עבודה', 'אחר'].map(opt => (
            <button key={opt} type="button" onClick={() => f('label')(opt)}
              style={{ padding: '6px 14px', fontSize: 12, border: `1.5px solid ${form.label === opt ? 'var(--ys-accent)' : '#E7E2D8'}`, background: form.label === opt ? '#FDF8EE' : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: form.label === opt ? 700 : 400 }}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <InputField label="שם פרטי" fieldKey="firstName" placeholder="ישראל" />
        <InputField label="שם משפחה" fieldKey="lastName" placeholder="ישראלי" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <InputField label="רחוב + מספר" fieldKey="street" placeholder="הרצל 10" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <InputField label="עיר" fieldKey="city" placeholder="תל אביב" />
        <InputField label='מיקוד (אופציונלי)' fieldKey="zip" placeholder="6120101" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <InputField label="מדינה" fieldKey="country" />
        <InputField label="טלפון (אופציונלי)" fieldKey="phone" type="tel" placeholder="050-0000000" />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={() => onSave(form)}
          style={{ background: 'var(--ys-dark-surface)', color: '#fff', border: 'none', padding: '11px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          שמור כתובת
        </button>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: '1px solid #E7E2D8', color: '#555', padding: '11px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ביטול
        </button>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const { user, updateLocalUser } = useAuth();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const addresses: Address[] = user.addresses || [];

  async function saveNewAddress(data: Omit<Address, 'id'>) {
    if (!user) return;
    setSaving(true);
    const newAddr: Address = { ...data, id: crypto.randomUUID() };
    const newList = [...addresses, newAddr];
    // אם זו הכתובת הראשונה — הגדר כברירת מחדל
    const updates: Record<string, unknown> = { addresses: newList };
    if (newList.length === 1) {
      updates.defaultShippingAddress = newAddr;
      updates.defaultBillingAddress = newAddr;
    }
    await updateDoc(doc(db, 'users', user.uid), updates);
    updateLocalUser({ addresses: newList, ...(newList.length === 1 ? { defaultShippingAddress: newAddr, defaultBillingAddress: newAddr } : {}) });
    setAddingNew(false);
    setSaving(false);
  }

  async function saveEditedAddress(data: Omit<Address, 'id'>) {
    if (!user || !editingAddress) return;
    setSaving(true);
    const updated: Address = { ...data, id: editingAddress.id };
    const newList = addresses.map(a => a.id === editingAddress.id ? updated : a);
    // עדכן גם ברירות מחדל אם הכתובת הנערכת היא ברירת המחדל
    const updates: Record<string, unknown> = { addresses: newList };
    if (user.defaultShippingAddress?.id === editingAddress.id) updates.defaultShippingAddress = updated;
    if (user.defaultBillingAddress?.id === editingAddress.id) updates.defaultBillingAddress = updated;
    await updateDoc(doc(db, 'users', user.uid), updates);
    updateLocalUser({ addresses: newList, ...('defaultShippingAddress' in updates ? { defaultShippingAddress: updated } : {}), ...('defaultBillingAddress' in updates ? { defaultBillingAddress: updated } : {}) });
    setEditingAddress(null);
    setSaving(false);
  }

  async function deleteAddress(addr: Address) {
    if (!user) return;
    if (!confirm(`למחוק את הכתובת "${addr.street}, ${addr.city}"?`)) return;
    const newList = addresses.filter(a => a.id !== addr.id);
    const updates: Record<string, unknown> = { addresses: newList };
    if (user.defaultShippingAddress?.id === addr.id) updates.defaultShippingAddress = newList[0] ?? null;
    if (user.defaultBillingAddress?.id === addr.id) updates.defaultBillingAddress = newList[0] ?? null;
    await updateDoc(doc(db, 'users', user.uid), updates);
    updateLocalUser({
      addresses: newList,
      defaultShippingAddress: (updates.defaultShippingAddress as Address | null | undefined),
      defaultBillingAddress: (updates.defaultBillingAddress as Address | null | undefined),
    });
  }

  async function setDefaultShipping(addr: Address) {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { defaultShippingAddress: addr });
    updateLocalUser({ defaultShippingAddress: addr });
  }

  async function setDefaultBilling(addr: Address) {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { defaultBillingAddress: addr });
    updateLocalUser({ defaultBillingAddress: addr });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 300, color: 'var(--ys-text)', margin: 0, letterSpacing: '-0.01em' }}>הכתובות שלי</h2>
        {!addingNew && !editingAddress && (
          <button
            onClick={() => setAddingNew(true)}
            style={{ background: 'var(--ys-dark-surface)', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + הוסף כתובת
          </button>
        )}
      </div>

      {/* טופס הוספה */}
      {addingNew && (
        <AddressForm
          initial={EMPTY_ADDRESS}
          onSave={saveNewAddress}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {/* טופס עריכה */}
      {editingAddress && (
        <AddressForm
          initial={editingAddress}
          onSave={saveEditedAddress}
          onCancel={() => setEditingAddress(null)}
        />
      )}

      {/* רשימת כתובות */}
      {addresses.length === 0 && !addingNew ? (
        <div style={{ background: '#fff', padding: '40px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
          <div style={{ fontSize: 15, color: '#555', marginBottom: 16 }}>עוד אין כתובות שמורות</div>
          <button onClick={() => setAddingNew(true)}
            style={{ background: 'var(--ys-dark-surface)', color: '#fff', border: 'none', padding: '11px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            הוסף כתובת ראשונה
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              isDefaultShipping={user.defaultShippingAddress?.id === addr.id}
              isDefaultBilling={user.defaultBillingAddress?.id === addr.id}
              onEdit={() => { setAddingNew(false); setEditingAddress(addr); }}
              onDelete={() => deleteAddress(addr)}
              onSetShipping={() => setDefaultShipping(addr)}
              onSetBilling={() => setDefaultBilling(addr)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
