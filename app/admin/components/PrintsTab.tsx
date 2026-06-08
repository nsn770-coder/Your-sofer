'use client';
import { Order } from '@/app/lib/types';

interface PrintsTabProps {
  orders: Order[];
}

export default function PrintsTab({ orders }: PrintsTabProps) {
  const printOrders = orders.filter(o => o.printCustomization);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>🖨️ הדפסות</h2>

      <div style={{
        background: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
      }}>
        <span style={{ fontWeight: 700, color: '#dc2626' }}>
          {printOrders.length} הדפסות ממתינות
        </span>
      </div>

      {printOrders.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          אין הדפסות ממתינות
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>הזמנה</th>
              <th style={{ padding: 10, textAlign: 'right' }}>לקוח</th>
              <th style={{ padding: 10, textAlign: 'right' }}>טלפון</th>
              <th style={{ padding: 10, textAlign: 'right' }}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {printOrders.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{o.orderNumber}</td>
                <td style={{ padding: 10 }}>{o.customerName}</td>
                <td style={{ padding: 10 }}>{o.phone || '-'}</td>
                <td style={{ padding: 10 }}>
                  <span style={{
                    background: o.status === 'delivered' ? '#ecfdf5' : '#fef3c7',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}>
                    {o.status === 'delivered' ? '✓ הופקה' : '⏳ ממתינה'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
