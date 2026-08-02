'use client';
// בורר צבע עגול — משמש גם לצבע הבסיס וגם לצבע הטקסט

export default function ColorPicker({
  label, colors, value, onChange,
}: {
  label: string;
  colors: { hex: string; name: string }[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</div>
      {/* לוח צבעים רחב — grid שממלא את רוחב העורך */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
        {colors.map(c => (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            title={c.name}
            aria-label={`${label}: ${c.name}`}
            aria-pressed={value === c.hex}
            style={{
              width: '100%', aspectRatio: '1', borderRadius: '50%', cursor: 'pointer',
              background: c.hex,
              border: ['#FFFFFF', '#F3F4F6', '#FDE68A'].includes(c.hex) ? '1px solid #d1d5db' : `1px solid ${c.hex}`,
              outline: value === c.hex ? '3px solid #2563eb' : '2px solid transparent',
              outlineOffset: 2,
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
