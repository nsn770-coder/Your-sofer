'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface StickerProduct {
  id: string;
  name: string;
  cat?: string;
  supplierCode?: string;
}

export default function StickersTab() {
  const [products, setProducts] = useState<StickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerProduct)));
      setLoading(false);
    });
  }, []);

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.supplierCode?.includes(search)
  );

  function printQR(productId: string, name: string) {
    const url = `${window.location.origin}/product/${productId}`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR - ${name}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
      </head><body style="font-family:sans-serif;padding:20px;text-align:center">
        <h3>${name}</h3>
        <canvas id="qr"></canvas>
        <p style="font-size:11px;color:#666">${url}</p>
        <script>
          QRCode.toCanvas(document.getElementById('qr'), '${url}', { width: 200 }, function() { window.print(); });
        </script>
      </body></html>
    `);
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>🏷️ מדבקות QR</h2>

      <div style={{ marginBottom: 15 }}>
        <input
          type="text"
          placeholder="חפש מוצר או קוד ספק..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>טוען...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>מוצר</th>
              <th style={{ padding: 10, textAlign: 'right' }}>קטגוריה</th>
              <th style={{ padding: 10, textAlign: 'right' }}>קוד ספק</th>
              <th style={{ padding: 10, textAlign: 'center' }}>QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{p.name?.slice(0, 45)}</td>
                <td style={{ padding: 10, color: '#666' }}>{p.cat || '-'}</td>
                <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{p.supplierCode || '-'}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => printQR(p.id, p.name)}
                    style={{
                      background: '#4338ca',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    הדפס QR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
