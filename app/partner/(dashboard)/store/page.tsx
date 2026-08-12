'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePartner } from '@/app/contexts/PartnerContext';
import { ImageUploadField } from '@/app/components/partner/ImageUploadField';

const DEFAULT_COLORS = { primary: '#3A2352', secondary: '#F0EDE8', cta: '#C9A227' };

export default function PartnerStorePage() {
  const { user } = useAuth();
  const { partner, loading, refreshPartner } = usePartner();

  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [colors, setColors] = useState(DEFAULT_COLORS);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!partner) return;
    setStoreName(partner.storeName || '');
    setStoreDescription(partner.storeDescription || '');
    setLogoUrl(partner.logoUrl || '');
    setHeroImageUrl(partner.heroImageUrl || '');
    setWhatsapp(partner.whatsapp || '');
    setFacebook(partner.facebook || '');
    setInstagram(partner.instagram || '');
    setColors(partner.colors || DEFAULT_COLORS);
  }, [partner]);

  async function save(publish: boolean) {
    if (!user?.idToken) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/partner/store-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({
          storeName,
          storeDescription,
          logoUrl,
          heroImageUrl,
          whatsapp,
          facebook,
          instagram,
          colors,
          ...(publish ? { publish: true } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שמירה נכשלה');

      await refreshPartner();
      setMessage({
        type: 'ok',
        text: publish ? 'החנות פורסמה בהצלחה' : 'הפרטים נשמרו',
      });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'שגיאה' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">בטעינה...</p>;

  const canPublish = !!storeName && !!logoUrl && !!colors;

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">החנות שלי</h1>
          <p className="text-gray-600 mt-1">
            כתובת החנות:{' '}
            <span className="font-mono text-sm">/store/{partner?.storeUrl || '—'}</span>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            partner?.isPublished
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {partner?.isPublished ? 'מפורסמת' : 'לא מפורסמת'}
        </span>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">פרטי החנות</h2>

        <Field label="שם החנות *">
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>

        <Field label="תיאור">
          <textarea
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>

        <ImageUploadField
          label="לוגו החנות"
          required
          shape="square"
          value={logoUrl}
          onChange={setLogoUrl}
          hint="מומלץ ריבועי, רקע שקוף או לבן"
        />

        <ImageUploadField
          label="תמונת נושא"
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          hint="תמונה רחבה שתופיע בראש עמוד החנות"
        />
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">צבעים</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['primary', 'secondary', 'cta'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm text-gray-700 mb-1">
                {key === 'primary' ? 'ראשי' : key === 'secondary' ? 'משני' : 'כפתור'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                  className="h-9 w-12 border border-gray-300 rounded"
                />
                <input
                  value={colors[key]}
                  onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                  dir="ltr"
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">דרכי תקשורת</h2>
        <Field label="וואטסאפ">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="0501234567"
            dir="ltr"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="פייסבוק">
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            dir="ltr"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="אינסטגרם">
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            dir="ltr"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50"
        >
          {saving ? 'שומר...' : 'שמירה'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving || !canPublish}
          title={canPublish ? '' : 'נדרשים שם חנות, לוגו וצבעים'}
          className="px-5 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
        >
          שמירה ופרסום
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
