// Phase 11: Advanced Analytics Panel with Export
'use client';

import { useState, useEffect } from 'react';

interface ConversionRates {
  viewToCart: string;
  cartToCheckout: string;
  checkoutToPurchase: string;
  visitorToPurchase: string;
}

interface Report {
  period: { startDate: string; endDate: string };
  totals: Record<string, number>;
  conversionRates: ConversionRates;
  averages: Record<string, string>;
}

export function AdvancedAnalyticsPanel({ idToken }: { idToken: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/partner/analytics/report?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const result = await res.json();
      if (result.success) {
        setReport(result.report);
      } else {
        setError(result.error || 'שגיאה בטעינת דוח');
      }
    } catch (err) {
      setError('שגיאת חיבור');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const url = `/api/partner/analytics/export?format=${exportFormat}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `analytics_${startDate}_to_${endDate}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError('שגיאה בהורדת הדוח');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-6">
      {/* Date Selector */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-right">בחר תאריכים</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-right">
            <label className="text-sm text-gray-600">מתאריך</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-right mt-1"
            />
          </div>
          <div className="text-right">
            <label className="text-sm text-gray-600">עד תאריך</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-right mt-1"
            />
          </div>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'טוען...' : 'טען דוח'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-right text-red-700">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Key Metrics */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-right">מדדי מפתח</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">הכנסה כוללת</p>
                <p className="text-xl font-bold text-gray-900">
                  ₪{report.totals.revenue?.toLocaleString('he-IL')}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">עמלה כוללת</p>
                <p className="text-xl font-bold text-blue-600">
                  ₪{report.totals.commission?.toLocaleString('he-IL')}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">מספר קניות</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.totals.purchases?.toLocaleString('he-IL')}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">מבקרים</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.totals.visitors?.toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Rates */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-right">שיעורי המרה</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-right">
                <span className="font-medium">{report.conversionRates.viewToCart}%</span>
                <span className="text-sm text-gray-600">צפיית מוצר → הוספה לסל</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-right">
                <span className="font-medium">{report.conversionRates.cartToCheckout}%</span>
                <span className="text-sm text-gray-600">סל → התחלת הזמנה</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-right">
                <span className="font-medium">{report.conversionRates.checkoutToPurchase}%</span>
                <span className="text-sm text-gray-600">התחלה → השלמת קנייה</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-right">
                <span className="font-medium">{report.conversionRates.visitorToPurchase}%</span>
                <span className="text-sm text-gray-600">מבקר → קנייה</span>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-right">ממוצעים יומיים</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">הכנסה ממוצעת</p>
                <p className="text-lg font-bold">₪{report.averages.dailyRevenue}</p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-right">
                <p className="text-xs text-gray-600">הזמנות ממוצעות</p>
                <p className="text-lg font-bold">{report.averages.dailyOrders}</p>
              </div>
              <div className="bg-gray-50 rounded p-3 text-right col-span-2">
                <p className="text-xs text-gray-600">ערך הזמנה ממוצע</p>
                <p className="text-lg font-bold">₪{report.averages.avgOrderValue}</p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-lg font-semibold text-right">ייצוא דוח</h3>
            <div className="flex gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                className="flex-1 px-3 py-2 border rounded text-right"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <button
                onClick={handleExport}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
              >
                הורד
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
