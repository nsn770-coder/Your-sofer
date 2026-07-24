'use client';
import { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { Product } from '@/app/lib/types';
import { Order } from '@/app/lib/types';
import { type AccountEra, isOrderInEra, isDateInEra } from '@/app/lib/accountEra';
import EraToggle from '@/app/components/EraToggle';

// ── קבועים ────────────────────────────────────────────────────────────────────
const CLOUDINARY_RECEIPT_UPLOAD = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/auto/upload';
const PAID_STATUSES = ['paid', 'completed', 'shipped', 'packing', 'magiah'];
const VAT = 1.18;

export const EXPENSE_CATEGORIES = [
  'שיווק — Google',
  'שיווק — Meta / פייסבוק',
  'שיווק — TikTok',
  'מנוי — Cloudinary',
  'מנוי — Sumit',
  'מנוי — תוכנות AI',
  'מנוי — פלטפורמה אחרת',
  'סחורה מספק',
  'אחר',
] as const;

const METHOD_LABELS: Record<string, string> = {
  bit: '💜 ביט',
  bank: '🏦 העברה בנקאית',
  cash: '💵 מזומן',
  other: 'אחר',
};

// ── טיפוסים ──────────────────────────────────────────────────────────────────
export interface FinanceIncome {
  id: string;
  amount: number;          // ברוטו ₪
  method: 'bit' | 'bank' | 'cash' | 'other';
  description: string;
  date: string;            // YYYY-MM-DD
}

export interface FinanceExpense {
  id: string;
  amount: number;          // חד-פעמית: הסכום. קבועה: הסכום החודשי הבסיסי
  category: string;
  description: string;
  date: string;            // YYYY-MM-DD. בקבועה: תאריך החיוב הראשון (היום בחודש = יום החיוב)
  recurring: boolean;
  overrides?: Record<string, number>; // 'YYYY-MM' → סכום שונה לאותו חודש
  receiptUrl?: string;
  source?: 'manual' | 'inventory';
  supplier?: string;
  invoiceNumber?: string;
}

interface ProfitabilityTabProps {
  products: Product[];
  orders: Order[];
}

// ── עזרי תאריכים ─────────────────────────────────────────────────────────────
const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('he-IL');
const toInputDate = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** כל מופעי החיוב של הוצאה בטווח תאריכים (קבועה = פעם בחודש ביום החיוב, עם overrides) */
export function expenseOccurrencesInRange(
  exp: FinanceExpense, from: Date, to: Date,
): { date: Date; amount: number; monthKey: string }[] {
  const start = new Date(exp.date + 'T12:00:00');
  if (isNaN(start.getTime())) return [];

  if (!exp.recurring) {
    return start >= from && start <= to
      ? [{ date: start, amount: exp.amount, monthKey: monthKeyOf(start) }]
      : [];
  }

  const out: { date: Date; amount: number; monthKey: string }[] = [];
  const chargeDay = start.getDate();
  let y = start.getFullYear();
  let m = start.getMonth();
  for (let i = 0; i < 240; i++) { // עד 20 שנה — מגן מלולאה אינסופית
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const chargeDate = new Date(y, m, Math.min(chargeDay, daysInMonth), 12);
    if (chargeDate > to) break;
    if (chargeDate >= start && chargeDate >= from) {
      const mk = monthKeyOf(chargeDate);
      out.push({ date: chargeDate, amount: exp.overrides?.[mk] ?? exp.amount, monthKey: mk });
    }
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

const downloadUrl = (url: string) => url.replace('/upload/', '/upload/fl_attachment/');

/** נרמול תאריך מה-OCR ל-YYYY-MM-DD; נופל להיום אם לא ניתן לפרש */
function normalizeOcrDate(raw: string | undefined): string {
  const todayStr = () => toInputDate(new Date());
  if (!raw) return todayStr();
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return todayStr();
}

// שורה בטבלת האישור של העלאת קבלות מרובה
interface BulkReceiptRow {
  fileName: string;
  status: 'processing' | 'ready' | 'error';
  receiptUrl: string | null;
  supplier: string;
  date: string;          // YYYY-MM-DD
  invoiceNumber: string;
  amount: string;        // ניתן לעריכה לפני שמירה
  category: string;
  include: boolean;
  saved?: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfitabilityTab({ products, orders }: ProfitabilityTabProps) {
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [era, setEra] = useState<AccountEra>('business');

  // ── הכנסות/הוצאות ידניות ──
  const [incomes, setIncomes] = useState<FinanceIncome[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [clearingPercent, setClearingPercent] = useState(1.5);
  const [clearingInput, setClearingInput] = useState('1.5');

  // ── טפסים ──
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const today = toInputDate(new Date());
  const [incomeForm, setIncomeForm] = useState({ amount: '', method: 'bit', description: '', date: today });
  const [expenseForm, setExpenseForm] = useState({
    amount: '', category: EXPENSE_CATEGORIES[0] as string, description: '', date: today,
    recurring: false, receiptUrl: '',
  });
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);

  // ── העלאת קבלות מרובה ──
  const [bulkRows, setBulkRows] = useState<BulkReceiptRow[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // ── טעינת נתונים פיננסיים ──
  useEffect(() => {
    (async () => {
      try {
        const [incSnap, expSnap, cfgSnap] = await Promise.all([
          getDocs(collection(db, 'finance_incomes')),
          getDocs(collection(db, 'finance_expenses')),
          getDoc(doc(db, 'finance_settings', 'config')),
        ]);
        const inc: FinanceIncome[] = [];
        incSnap.forEach(d => inc.push({ id: d.id, ...d.data() } as FinanceIncome));
        const exp: FinanceExpense[] = [];
        expSnap.forEach(d => exp.push({ id: d.id, ...d.data() } as FinanceExpense));
        inc.sort((a, b) => b.date.localeCompare(a.date));
        exp.sort((a, b) => b.date.localeCompare(a.date));
        setIncomes(inc);
        setExpenses(exp);
        if (cfgSnap.exists()) {
          const p = Number(cfgSnap.data().clearingPercent);
          if (!isNaN(p) && p >= 0) { setClearingPercent(p); setClearingInput(String(p)); }
        }
      } catch (e) {
        console.error('[ProfitabilityTab] load finance:', e);
      } finally {
        setFinanceLoading(false);
      }
    })();
  }, []);

  // ── טווח תאריכים ──
  const getRangeBounds = (): { from: Date; to: Date } => {
    // סוף היום — כדי שהוצאות/הכנסות שנרשמו היום (נשמרות בשעה 12:00) ייספרו גם בבוקר
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    if (dateRange === 'custom' && customFrom && customTo) {
      return { from: new Date(customFrom + 'T00:00:00'), to: new Date(customTo + 'T23:59:59') };
    }
    const from = new Date();
    switch (dateRange) {
      case 'day':     from.setDate(from.getDate() - 1); break;
      case 'week':    from.setDate(from.getDate() - 7); break;
      case 'quarter': from.setMonth(from.getMonth() - 3); break;
      case 'year':    from.setFullYear(from.getFullYear() - 1); break;
      default:        from.setMonth(from.getMonth() - 1); break; // month + custom חסר
    }
    return { from, to };
  };
  const { from: rangeFrom, to: rangeTo } = getRangeBounds();

  const getOrderDateOf = (order: Order): Date =>
    order.createdAt instanceof Date
      ? order.createdAt
      : new Date(((order.createdAt as { seconds: number } | undefined)?.seconds ?? 0) * 1000);

  const getFilteredOrders = () =>
    orders.filter(order => {
      const orderDate = getOrderDateOf(order);
      if (!isOrderInEra(order as { account?: string }, orderDate, era)) return false;
      return orderDate >= rangeFrom && orderDate <= rangeTo;
    });

  // ── רווחיות פר-מוצר (לוגיקה קיימת) ──
  const getProfitData = () => {
    const profitMap: Record<string, {
      name: string; sold: number;
      revenue: number; cost: number; profit: number; profitAfterVat: number;
      noCost: boolean;
    }> = {};

    getFilteredOrders().forEach(order => {
      (order.items ?? []).forEach(item => {
        const anyItem = item as { productId?: string; id?: string; productName?: string; name?: string };
        const pid = anyItem.productId ?? anyItem.id;
        if (!pid) return;
        const product = products.find(p => p.id === pid);
        if (!product) return;

        const supplierCost = product.supplierCost ?? 0;
        const noCost       = supplierCost === 0;

        const paid           = item.price * item.quantity;
        const revenueNet     = paid / VAT;
        const costInclVat    = supplierCost * 0.95 * VAT * item.quantity;
        const costNet        = supplierCost * 0.95 * item.quantity;
        const profitCashflow = revenueNet - costInclVat;
        const profitAfterVat = revenueNet - costNet;

        if (!profitMap[pid]) {
          profitMap[pid] = {
            name: anyItem.productName ?? anyItem.name ?? pid,
            sold: 0, revenue: 0, cost: 0, profit: 0, profitAfterVat: 0,
            noCost,
          };
        }
        profitMap[pid].sold          += item.quantity;
        profitMap[pid].revenue       += revenueNet;
        profitMap[pid].cost          += costInclVat;
        profitMap[pid].profit        += profitCashflow;
        profitMap[pid].profitAfterVat += profitAfterVat;
      });
    });

    return Object.values(profitMap).sort((a, b) => b.profit - a.profit);
  };

  const profitData       = getProfitData();
  const totalRevenue     = profitData.reduce((s, p) => s + p.revenue,       0);
  const totalCost        = profitData.reduce((s, p) => s + p.cost,          0);
  const totalProfit      = profitData.reduce((s, p) => s + p.profit,        0);
  const totalAfterVat    = profitData.reduce((s, p) => s + p.profitAfterVat, 0);
  const profitPercent    = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  // ── הכנסות offline בטווח ──
  const incomesInRange = incomes.filter(i => {
    const d = new Date(i.date + 'T12:00:00');
    return d >= rangeFrom && d <= rangeTo && isDateInEra(d, era);
  });
  const offlineGross = incomesInRange.reduce((s, i) => s + i.amount, 0);
  const offlineNet   = offlineGross / VAT;

  // ── מופעי הוצאות בטווח ──
  const expenseOccs = expenses.flatMap(exp =>
    expenseOccurrencesInRange(exp, rangeFrom, rangeTo)
      .filter(o => isDateInEra(o.date, era))
      .map(o => ({ exp, ...o }))
  );
  const inventoryExpensesTotal   = expenseOccs.filter(o => o.exp.source === 'inventory').reduce((s, o) => s + o.amount, 0);
  const operationalExpensesTotal = expenseOccs.filter(o => o.exp.source !== 'inventory').reduce((s, o) => s + o.amount, 0);
  const allManualExpensesTotal   = inventoryExpensesTotal + operationalExpensesTotal;

  // ── עמלת סליקה — % מהזמנות ששולמו בכרטיס אשראי (לא ביט) בטווח ──
  const paidOrdersInRange = getFilteredOrders().filter(o => PAID_STATUSES.includes(o.status ?? ''));
  const creditCardGross   = paidOrdersInRange
    .filter(o => (o as { paymentMethod?: string }).paymentMethod !== 'bit')
    .reduce((s, o) => s + (o.total || 0), 0);
  const clearingFee = creditCardGross * clearingPercent / 100;

  // ── שורה תחתונה ──
  // רווח תפעולי: רווח לפי עלות-מכר + הכנסות offline (נטו) − הוצאות שוטפות − סליקה (בלי קניות סחורה — העלות כבר מגולמת פר-מוצר)
  const operatingProfit = totalProfit + offlineNet - operationalExpensesTotal - clearingFee;
  // תזרים בפועל: כל הכסף שנכנס (ברוטו) − כל הכסף שיצא (כולל קבלות סחורה), בלי עלות-מכר פר-מוצר
  const websiteGross = paidOrdersInRange.reduce((s, o) => s + (o.total || 0), 0);
  const cashIn  = websiteGross + offlineGross;
  const cashOut = allManualExpensesTotal + clearingFee;
  const cashBalance = cashIn - cashOut;

  // ── שווי מלאי שטרם נמכר (קיים) ──
  const unsoldInventory = (() => {
    const soldMap: Record<string, number> = orders
      .filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled')
      .flatMap(o => o.items ?? [])
      .reduce<Record<string, number>>((m, i) => {
        const pid = (i as { productId?: string; id?: string }).productId ?? (i as { productId?: string; id?: string }).id;
        if (pid) m[pid] = (m[pid] ?? 0) + i.quantity;
        return m;
      }, {});

    let value = 0;
    let count = 0;
    for (const p of products) {
      if (!p.receivedFromSupplier || !p.supplierCost) continue;
      const currentStock = p.receivedFromSupplier - (soldMap[p.id] ?? 0);
      if (currentStock > 0) {
        value += currentStock * p.supplierCost;
        count++;
      }
    }
    return { value, count };
  })();

  // ── פעולות: הכנסות ──
  async function addIncome() {
    const amount = parseFloat(incomeForm.amount);
    if (!amount || amount <= 0) { alert('יש להזין סכום תקין'); return; }
    if (!incomeForm.date) { alert('יש לבחור תאריך'); return; }
    setSavingForm(true);
    try {
      const data = {
        amount,
        method: incomeForm.method as FinanceIncome['method'],
        description: incomeForm.description.trim(),
        date: incomeForm.date,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'finance_incomes'), data);
      setIncomes(prev => [{ id: ref.id, ...data } as FinanceIncome, ...prev]);
      setIncomeForm({ amount: '', method: 'bit', description: '', date: today });
      setIncomeFormOpen(false);
    } catch (e) {
      alert('שגיאה בשמירה'); console.error(e);
    } finally { setSavingForm(false); }
  }

  async function deleteIncome(id: string) {
    if (!window.confirm('למחוק את ההכנסה?')) return;
    await deleteDoc(doc(db, 'finance_incomes', id));
    setIncomes(prev => prev.filter(i => i.id !== id));
  }

  // ── פעולות: הוצאות ──
  async function addExpense() {
    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) { alert('יש להזין סכום תקין'); return; }
    if (!expenseForm.date) { alert('יש לבחור תאריך'); return; }
    setSavingForm(true);
    try {
      const data: Omit<FinanceExpense, 'id'> & { createdAt: unknown } = {
        amount,
        category: expenseForm.category,
        description: expenseForm.description.trim(),
        date: expenseForm.date,
        recurring: expenseForm.recurring,
        overrides: {},
        // קניית סחורה נספרת בתזרים בלבד — כמו קבלות מטאב המלאי
        source: expenseForm.category === 'סחורה מספק' ? 'inventory' : 'manual',
        ...(expenseForm.receiptUrl ? { receiptUrl: expenseForm.receiptUrl } : {}),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'finance_expenses'), data);
      setExpenses(prev => [{ id: ref.id, ...data } as unknown as FinanceExpense, ...prev]);
      setExpenseForm({ amount: '', category: EXPENSE_CATEGORIES[0], description: '', date: today, recurring: false, receiptUrl: '' });
      setExpenseFormOpen(false);
    } catch (e) {
      alert('שגיאה בשמירה'); console.error(e);
    } finally { setSavingForm(false); }
  }

  async function deleteExpense(id: string) {
    if (!window.confirm('למחוק את ההוצאה? (הוצאה קבועה תפסיק להיספר בכל החודשים)')) return;
    await deleteDoc(doc(db, 'finance_expenses', id));
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function editExpenseBaseAmount(exp: FinanceExpense) {
    const v = window.prompt(
      exp.recurring ? 'סכום חודשי בסיסי חדש (₪):' : 'סכום חדש (₪):',
      String(exp.amount),
    );
    if (v == null) return;
    const amount = parseFloat(v);
    if (!amount || amount <= 0) { alert('סכום לא תקין'); return; }
    await updateDoc(doc(db, 'finance_expenses', exp.id), { amount });
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, amount } : e));
  }

  /** שינוי קטגוריה של הוצאה קיימת — מעדכן גם את source (סחורה=תזרים בלבד, אחר=תפעולי) */
  async function changeExpenseCategory(exp: FinanceExpense, newCategory: string) {
    // הוצאות מלאי אוטומטיות שמקורן בטאב מלאי נשארות סחורה; שינוי ידני דורס
    const newSource: FinanceExpense['source'] = newCategory === 'סחורה מספק' ? 'inventory' : 'manual';
    await updateDoc(doc(db, 'finance_expenses', exp.id), { category: newCategory, source: newSource });
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, category: newCategory, source: newSource } : e));
  }

  /** עריכת סכום לחודש ספציפי בהוצאה קבועה — נשמר כ-override רק לאותו חודש */
  async function editExpenseMonthAmount(exp: FinanceExpense) {
    const mk = monthKeyOf(new Date());
    const current = exp.overrides?.[mk] ?? exp.amount;
    const v = window.prompt(`סכום לחודש ${mk} בלבד (₪):\n(שאר החודשים יישארו ₪${exp.amount})`, String(current));
    if (v == null) return;
    const amount = parseFloat(v);
    if (isNaN(amount) || amount < 0) { alert('סכום לא תקין'); return; }
    await updateDoc(doc(db, 'finance_expenses', exp.id), { [`overrides.${mk}`]: amount });
    setExpenses(prev => prev.map(e => e.id === exp.id
      ? { ...e, overrides: { ...(e.overrides ?? {}), [mk]: amount } }
      : e));
  }

  // ── העלאת קבלה ל-Cloudinary ──
  async function uploadReceiptFile(file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res = await fetch(CLOUDINARY_RECEIPT_UPLOAD, { method: 'POST', body: fd });
      const data = await res.json();
      return data.secure_url ?? null;
    } catch (e) {
      console.error('[uploadReceiptFile]', e);
      return null;
    }
  }

  async function handleFormReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    const url = await uploadReceiptFile(file);
    setUploadingReceipt(false);
    if (url) setExpenseForm(f => ({ ...f, receiptUrl: url }));
    else alert('שגיאה בהעלאת הקבלה');
    e.target.value = '';
  }

  async function attachReceiptToExpense(exp: FinanceExpense, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    const url = await uploadReceiptFile(file);
    setUploadingReceipt(false);
    if (!url) { alert('שגיאה בהעלאת הקבלה'); return; }
    await updateDoc(doc(db, 'finance_expenses', exp.id), { receiptUrl: url });
    setExpenses(prev => prev.map(x => x.id === exp.id ? { ...x, receiptUrl: url } : x));
    e.target.value = '';
  }

  // ── העלאת קבלות מרובה: כל קובץ מועלה ל-Cloudinary + נקרא ע"י AI (ספק, תאריך, סכום) ──
  function updateBulkRow(index: number, patch: Partial<BulkReceiptRow>) {
    setBulkRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  async function handleBulkFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const startIndex = bulkRows.length;
    setBulkRows(prev => [
      ...prev,
      ...files.map((f): BulkReceiptRow => ({
        fileName: f.name, status: 'processing', receiptUrl: null,
        supplier: '', date: toInputDate(new Date()), invoiceNumber: '',
        amount: '', category: 'סחורה מספק', include: true,
      })),
    ]);
    setBulkProcessing(true);

    try {
      // עיבוד סדרתי — קובץ אחר קובץ (העלאה + פענוח במקביל לאותו קובץ)
      for (let i = 0; i < files.length; i++) {
        const idx = startIndex + i;
        const file = files[i];
        try {
          const parsePromise = (async () => {
            const fd = new FormData();
            fd.append('image', file);
            const res = await fetch('/api/parse-expense-receipt', { method: 'POST', body: fd });
            return await res.json() as { success?: boolean; supplier?: string; invoiceDate?: string; invoiceNumber?: string; total?: number };
          })();
          const [url, parsed] = await Promise.all([uploadReceiptFile(file), parsePromise]);

          if (!url && !parsed.success) {
            updateBulkRow(idx, { status: 'error', error: 'ההעלאה והפענוח נכשלו' });
            continue;
          }
          updateBulkRow(idx, {
            status: 'ready',
            receiptUrl: url,
            supplier:      parsed.supplier || '',
            date:          normalizeOcrDate(parsed.invoiceDate),
            invoiceNumber: parsed.invoiceNumber || '',
            amount:        parsed.total && parsed.total > 0 ? String(parsed.total) : '',
            error: !parsed.success ? 'הפענוח נכשל — יש למלא ידנית' : !url ? 'הקובץ לא נשמר במאגר' : undefined,
          });
        } catch (err) {
          console.error('[bulk receipt]', file.name, err);
          updateBulkRow(idx, { status: 'error', error: 'שגיאה בעיבוד' });
        }
      }
    } finally {
      setBulkProcessing(false);
    }
  }

  async function saveBulkRows() {
    const toSave = bulkRows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.include && !r.saved && r.status !== 'processing');
    if (toSave.length === 0) { alert('אין שורות לשמירה'); return; }
    for (const { r, i } of toSave) {
      const amount = parseFloat(r.amount);
      if (!amount || amount <= 0) { alert(`שורה ${i + 1} (${r.fileName}): חסר סכום תקין`); return; }
      if (!r.date) { alert(`שורה ${i + 1} (${r.fileName}): חסר תאריך`); return; }
    }
    setBulkSaving(true);
    try {
      for (const { r, i } of toSave) {
        const amount = parseFloat(r.amount);
        const data = {
          amount,
          category:    r.category,
          description: r.supplier ? `קבלה — ${r.supplier}` : `קבלה (${r.fileName})`,
          date:        r.date,
          recurring:   false,
          overrides:   {},
          // קניית סחורה נספרת בתזרים בלבד (העלות פר-מוצר כבר ברווח התפעולי)
          source:      (r.category === 'סחורה מספק' ? 'inventory' : 'manual') as FinanceExpense['source'],
          supplier:      r.supplier,
          invoiceNumber: r.invoiceNumber,
          ...(r.receiptUrl ? { receiptUrl: r.receiptUrl } : {}),
          createdAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, 'finance_expenses'), data);
        setExpenses(prev => [{ id: ref.id, ...data } as unknown as FinanceExpense, ...prev]);
        updateBulkRow(i, { saved: true });
      }
      alert(`✅ נשמרו ${toSave.length} הוצאות עם קבלות`);
      setBulkRows(prev => prev.filter(r => !r.saved));
    } catch (e) {
      alert('שגיאה בשמירה — חלק מהשורות אולי נשמרו'); console.error(e);
    } finally {
      setBulkSaving(false);
    }
  }

  // ── שמירת % סליקה ──
  async function saveClearingPercent() {
    const p = parseFloat(clearingInput);
    if (isNaN(p) || p < 0 || p > 100) { alert('אחוז לא תקין'); return; }
    setClearingPercent(p);
    await setDoc(doc(db, 'finance_settings', 'config'), { clearingPercent: p }, { merge: true });
  }

  // ── ייצוא לאקסל ──
  async function exportToExcel() {
    if (!exportFrom || !exportTo) { alert('יש לבחור טווח תאריכים'); return; }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const from = new Date(exportFrom + 'T00:00:00');
      const to   = new Date(exportTo + 'T23:59:59');

      // הזמנות אתר ששולמו בטווח (לפי העידן הנבחר)
      const exOrders = orders.filter(o => {
        const d = getOrderDateOf(o);
        if (!isOrderInEra(o as { account?: string }, d, era)) return false;
        return PAID_STATUSES.includes(o.status ?? '') && d >= from && d <= to;
      });
      const exIncomes = incomes.filter(i => {
        const d = new Date(i.date + 'T12:00:00');
        return d >= from && d <= to && isDateInEra(d, era);
      });
      const exExpOccs = expenses.flatMap(exp =>
        expenseOccurrencesInRange(exp, from, to)
          .filter(o => isDateInEra(o.date, era))
          .map(o => ({ exp, ...o }))
      );
      const exCreditGross = exOrders
        .filter(o => (o as { paymentMethod?: string }).paymentMethod !== 'bit')
        .reduce((s, o) => s + (o.total || 0), 0);
      const exClearing = exCreditGross * clearingPercent / 100;

      const rows: (string | number)[][] = [];
      rows.push(['דוח הכנסות והוצאות — YourSofer']);
      rows.push([`טווח: ${fmtDate(from)} עד ${fmtDate(to)}`]);
      rows.push([]);
      rows.push(['סוג', 'תאריך', 'פירוט', 'אמצעי / קטגוריה', 'הכנסה (₪)', 'הוצאה (₪)']);

      exOrders
        .sort((a, b) => getOrderDateOf(a).getTime() - getOrderDateOf(b).getTime())
        .forEach(o => {
          const isBit = (o as { paymentMethod?: string }).paymentMethod === 'bit';
          rows.push([
            'הזמנה באתר',
            fmtDate(getOrderDateOf(o)),
            `הזמנה #${o.orderNumber || o.id} — ${o.customerName || ''}`,
            isBit ? 'ביט (אתר)' : 'כרטיס אשראי (אתר)',
            Math.round((o.total || 0) * 100) / 100,
            '',
          ]);
        });

      exIncomes
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(i => {
          rows.push([
            'הכנסה ידנית',
            fmtDate(new Date(i.date + 'T12:00:00')),
            i.description || '',
            METHOD_LABELS[i.method]?.replace(/^[^\s]+\s/, '') ?? i.method,
            i.amount,
            '',
          ]);
        });

      exExpOccs
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .forEach(({ exp, date, amount }) => {
          rows.push([
            exp.source === 'inventory' ? 'קניית סחורה (קבלה)' : 'הוצאה',
            fmtDate(date),
            [exp.description, exp.supplier ? `ספק: ${exp.supplier}` : '', exp.invoiceNumber ? `חשבונית #${exp.invoiceNumber}` : ''].filter(Boolean).join(' | '),
            exp.category + (exp.recurring ? ' (קבועה)' : ''),
            '',
            amount,
          ]);
        });

      if (exClearing > 0) {
        rows.push([
          'עמלת סליקה',
          '',
          `${clearingPercent}% מעסקאות אשראי בסך ₪${exCreditGross.toFixed(0)}`,
          'סליקה',
          '',
          Math.round(exClearing * 100) / 100,
        ]);
      }

      const totalIn  = exOrders.reduce((s, o) => s + (o.total || 0), 0) + exIncomes.reduce((s, i) => s + i.amount, 0);
      const totalOut = exExpOccs.reduce((s, o) => s + o.amount, 0) + exClearing;
      const balance  = totalIn - totalOut;

      rows.push([]);
      rows.push(['סה"כ הכנסות', '', '', '', Math.round(totalIn * 100) / 100, '']);
      rows.push(['סה"כ הוצאות', '', '', '', '', Math.round(totalOut * 100) / 100]);
      rows.push([balance >= 0 ? 'מאזן: רווח (+)' : 'מאזן: הפסד (−)', '', '', '', Math.round(balance * 100) / 100, '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 45 }, { wch: 22 }, { wch: 13 }, { wch: 13 }];
      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      XLSX.utils.book_append_sheet(wb, ws, 'הכנסות והוצאות');
      XLSX.writeFile(wb, `yoursofer-finance_${exportFrom}_${exportTo}.xlsx`);
      setExportOpen(false);
    } catch (e) {
      alert('שגיאה בייצוא'); console.error(e);
    } finally { setExporting(false); }
  }

  // ── הורדת כל הקבלות ──
  const receiptsList = expenses.filter(e => e.receiptUrl);
  function downloadAllReceipts() {
    receiptsList.forEach((exp, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = downloadUrl(exp.receiptUrl!);
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 600);
    });
  }

  // ── סטיילים חוזרים ──
  const btnStyle = (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 6, padding: '8px 16px',
    fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
  });
  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13,
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>📊 דוח רווחיות</h2>

      {/* עסק / עמותה — המלאי למטה תמיד מחושב על כל ההיסטוריה */}
      <EraToggle era={era} setEra={setEra} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['day', 'week', 'month', 'quarter', 'year', 'custom'] as const).map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700,
              border:     dateRange === range ? '2px solid #0c1a35' : '1px solid #ddd',
              background: dateRange === range ? '#0c1a35' : '#fff',
              color:      dateRange === range ? '#fff' : '#0c1a35',
            }}
          >
            {range === 'day'     && '📅 יום'}
            {range === 'week'    && '📆 שבוע'}
            {range === 'month'   && '📊 חודש'}
            {range === 'quarter' && '📈 רבעון'}
            {range === 'year'    && '📉 שנה'}
            {range === 'custom'  && '🗓 טווח מותאם'}
          </button>
        ))}
        {dateRange === 'custom' && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
            <span style={{ fontSize: 13 }}>עד</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
          </span>
        )}
      </div>

      {/* ── כפתורי פעולה פיננסיים ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => { setIncomeFormOpen(o => !o); setExpenseFormOpen(false); }} style={btnStyle('#059669')}>
          ➕ הוסף הכנסה (ביט / העברה)
        </button>
        <button onClick={() => { setExpenseFormOpen(o => !o); setIncomeFormOpen(false); }} style={btnStyle('#dc2626')}>
          ➕ הוסף הוצאה
        </button>
        <label style={{ ...btnStyle('#0d9488'), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {bulkProcessing ? '⏳ מעבד קבלות...' : '📤 העלה קבלות (מרובות)'}
          <input type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleBulkFiles} disabled={bulkProcessing} />
        </label>
        <button onClick={() => setReceiptsOpen(o => !o)} style={btnStyle('#7c3aed')}>
          🧾 כל הקבלות ({receiptsList.length})
        </button>
        <button
          onClick={() => {
            setExportFrom(toInputDate(rangeFrom));
            setExportTo(toInputDate(rangeTo));
            setExportOpen(o => !o);
          }}
          style={btnStyle('#0369a1')}
        >
          📥 ייצוא לאקסל
        </button>
      </div>

      {/* ── טופס הכנסה ── */}
      {incomeFormOpen && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>➕ הכנסה חדשה (שלא דרך האתר)</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="number" placeholder="סכום ₪ (כולל מע״מ)" value={incomeForm.amount}
              onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} style={{ ...inputStyle, width: 150 }} />
            <select value={incomeForm.method} onChange={e => setIncomeForm(f => ({ ...f, method: e.target.value }))} style={inputStyle}>
              <option value="bit">💜 ביט</option>
              <option value="bank">🏦 העברה בנקאית</option>
              <option value="cash">💵 מזומן</option>
              <option value="other">אחר</option>
            </select>
            <input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="תיאור (לדוגמה: מזוזה ללקוח פרטי)" value={incomeForm.description}
              onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
            <button onClick={addIncome} disabled={savingForm} style={btnStyle('#059669')}>
              {savingForm ? '⏳' : '✓ שמור'}
            </button>
          </div>
        </div>
      )}

      {/* ── טופס הוצאה ── */}
      {expenseFormOpen && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>➕ הוצאה חדשה</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="number" placeholder="סכום ₪" value={expenseForm.amount}
              onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
            <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            <input type="text" placeholder="תיאור" value={expenseForm.description}
              onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" checked={expenseForm.recurring}
                onChange={e => setExpenseForm(f => ({ ...f, recurring: e.target.checked }))} />
              🔁 הוצאה קבועה — תיספר אוטומטית כל חודש (ביום החיוב שבתאריך)
            </label>
            <label style={{ ...btnStyle('#f3f4f6', '#374151'), border: '1px solid #d1d5db', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {uploadingReceipt ? '⏳ מעלה...' : expenseForm.receiptUrl ? '✓ קבלה צורפה' : '📎 צרף קבלה (תמונה / PDF)'}
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFormReceiptUpload} disabled={uploadingReceipt} />
            </label>
            <button onClick={addExpense} disabled={savingForm} style={btnStyle('#dc2626')}>
              {savingForm ? '⏳' : '✓ שמור הוצאה'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
            💡 בהוצאה קבועה אפשר לערוך את הסכום לחודש מסוים בטבלה למטה (✏️ חודש נוכחי) — השינוי חל רק על אותו חודש.
            עמלת הסליקה מחושבת אוטומטית ({clearingPercent}% מעסקאות האשראי) — אין צורך להוסיף אותה ידנית.
          </div>
        </div>
      )}

      {/* ── טבלת אישור: העלאת קבלות מרובה ── */}
      {bulkRows.length > 0 && (
        <div style={{ background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 800 }}>
              📤 קבלות שהועלו ({bulkRows.length}){bulkProcessing && ' — מעבד...'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveBulkRows} disabled={bulkSaving || bulkProcessing} style={btnStyle('#0d9488')}>
                {bulkSaving ? '⏳ שומר...' : `✓ שמור ${bulkRows.filter(r => r.include && !r.saved && r.status !== 'processing').length} הוצאות`}
              </button>
              <button onClick={() => setBulkRows([])} disabled={bulkSaving || bulkProcessing} style={btnStyle('#e5e7eb', '#374151')}>
                נקה
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
            ה-AI קרא מכל קבלה את הספק, התאריך והסכום — בדוק ותקן במידת הצורך לפני השמירה. קטגוריית &quot;סחורה מספק&quot; נספרת בתזרים בלבד (לא ברווח התפעולי).
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #5eead4' }}>
                  <th style={{ padding: 6 }}></th>
                  <th style={{ padding: 6, textAlign: 'right' }}>קובץ</th>
                  <th style={{ padding: 6, textAlign: 'right' }}>ספק</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>תאריך</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>סכום ₪</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>קטגוריה</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>קבלה</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ccfbf1', opacity: r.saved ? 0.5 : r.include ? 1 : 0.45 }}>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <input type="checkbox" checked={r.include} disabled={!!r.saved}
                        onChange={ev => updateBulkRow(i, { include: ev.target.checked })} />
                    </td>
                    <td style={{ padding: 6, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.fileName}>
                      {r.fileName}
                    </td>
                    <td style={{ padding: 6 }}>
                      <input type="text" value={r.supplier} disabled={r.status === 'processing' || !!r.saved}
                        onChange={ev => updateBulkRow(i, { supplier: ev.target.value })}
                        style={{ width: '100%', minWidth: 110, padding: '3px 6px', border: '1px solid #99f6e4', borderRadius: 4, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <input type="date" value={r.date} disabled={r.status === 'processing' || !!r.saved}
                        onChange={ev => updateBulkRow(i, { date: ev.target.value })}
                        style={{ padding: '3px 6px', border: '1px solid #99f6e4', borderRadius: 4, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <input type="number" value={r.amount} disabled={r.status === 'processing' || !!r.saved}
                        onChange={ev => updateBulkRow(i, { amount: ev.target.value })} placeholder="₪"
                        style={{ width: 85, padding: '3px 6px', border: '1px solid #99f6e4', borderRadius: 4, fontSize: 12, textAlign: 'center', fontWeight: 700 }} />
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <select value={r.category} disabled={r.status === 'processing' || !!r.saved}
                        onChange={ev => updateBulkRow(i, { category: ev.target.value })}
                        style={{ padding: '3px 6px', border: '1px solid #99f6e4', borderRadius: 4, fontSize: 12, maxWidth: 140 }}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      {r.receiptUrl
                        ? <a href={r.receiptUrl} target="_blank" rel="noreferrer" style={{ color: '#0d9488', fontWeight: 700 }}>👁</a>
                        : r.status === 'processing' ? '⏳' : <span style={{ color: '#f59e0b' }} title="הקובץ לא נשמר במאגר">⚠️</span>}
                    </td>
                    <td style={{ padding: 6, textAlign: 'center', fontSize: 11 }}>
                      {r.saved
                        ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ נשמר</span>
                        : r.status === 'processing'
                          ? <span style={{ color: '#0369a1' }}>⏳ מעבד...</span>
                          : r.status === 'error'
                            ? <span style={{ color: '#dc2626', fontWeight: 700 }} title={r.error}>✕ שגיאה</span>
                            : r.error
                              ? <span style={{ color: '#d97706', fontWeight: 700 }} title={r.error}>⚠️ בדוק</span>
                              : <span style={{ color: '#16a34a' }}>מוכן</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── חלון ייצוא ── */}
      {exportOpen && (
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>📥 ייצוא טבלת הכנסות והוצאות לאקסל</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>מתאריך:</span>
            <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} style={inputStyle} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>עד תאריך:</span>
            <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} style={inputStyle} />
            <button onClick={exportToExcel} disabled={exporting} style={btnStyle('#0369a1')}>
              {exporting ? '⏳ מייצא...' : '📥 ייצא קובץ אקסל'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
            הקובץ כולל: הזמנות אתר ששולמו, הכנסות ידניות, כל ההוצאות (כולל קבועות וקבלות סחורה), עמלות סליקה — וחישוב מאזן סופי (+/−).
          </div>
        </div>
      )}

      {/* ── חלון קבלות ── */}
      {receiptsOpen && (
        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>🧾 קבלות שהועלו ({receiptsList.length})</div>
            {receiptsList.length > 0 && (
              <button onClick={downloadAllReceipts} style={btnStyle('#7c3aed')}>⬇️ הורד את כל הקבלות</button>
            )}
          </div>
          {receiptsList.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 13, padding: 10 }}>
              עדיין אין קבלות שמורות. קבלות חדשות מטאב המלאי יישמרו כאן אוטומטית, וגם קבלות שמצורפות להוצאות ידניות.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #c4b5fd' }}>
                  <th style={{ padding: 6, textAlign: 'right' }}>תאריך</th>
                  <th style={{ padding: 6, textAlign: 'right' }}>פירוט</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>קטגוריה</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>סכום</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>צפייה</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>הורדה</th>
                </tr>
              </thead>
              <tbody>
                {receiptsList.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #ede9fe' }}>
                    <td style={{ padding: 6 }}>{exp.date}</td>
                    <td style={{ padding: 6 }}>
                      {[exp.description, exp.supplier ? `ספק: ${exp.supplier}` : '', exp.invoiceNumber ? `#${exp.invoiceNumber}` : ''].filter(Boolean).join(' | ') || '—'}
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>{exp.category}</td>
                    <td style={{ padding: 6, textAlign: 'center', fontWeight: 700 }}>₪{exp.amount.toFixed(0)}</td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <a href={exp.receiptUrl} target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 700 }}>👁 צפה</a>
                    </td>
                    <td style={{ padding: 6, textAlign: 'center' }}>
                      <a href={downloadUrl(exp.receiptUrl!)} style={{ color: '#0369a1', fontWeight: 700 }}>⬇️</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── כרטיסי סיכום קיימים (רווחיות אתר לפי עלות-מכר) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 15, marginBottom: 20 }}>
        <div style={{ background: '#ecfdf5', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>רווח תזרימי</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>₪{totalProfit.toFixed(0)}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>רווח אחרי מע״מ תשומות</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>₪{totalAfterVat.toFixed(0)}</div>
        </div>
        <div style={{ background: '#eff6ff', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 700 }}>הכנסות נטו (ללא מע״מ)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0369a1' }}>₪{totalRevenue.toFixed(0)}</div>
        </div>
        <div style={{ background: '#fef2f2', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700 }}>עלויות כולל מע״מ</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626' }}>₪{totalCost.toFixed(0)}</div>
        </div>
        <div style={{ background: '#f5f3ff', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>% רווח תזרימי</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed' }}>{profitPercent}%</div>
        </div>
        <div style={{ background: '#f8f8f8', padding: 15, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>שווי מלאי (טרם נמכר)</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>₪{unsoldInventory.value.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{unsoldInventory.count} מוצרים במלאי · כולל מלאי מתקופת העמותה</div>
        </div>
      </div>

      {/* ── רווחיות כוללת — כולל הכנסות/הוצאות ידניות ── */}
      <div style={{ background: '#0c1a35', borderRadius: 10, padding: 18, marginBottom: 20 }}>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, marginBottom: 12 }}>
          💼 רווחיות כוללת לתקופה — כולל הכנסות והוצאות שמחוץ לאתר
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 700 }}>הכנסות offline (ביט / העברות)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#6ee7b7' }}>₪{offlineGross.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>נטו ללא מע״מ: ₪{offlineNet.toFixed(0)} · {incomesInRange.length} הכנסות</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700 }}>הוצאות שיווק ומנויים</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fca5a5' }}>₪{operationalExpensesTotal.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>כולל הוצאות קבועות חודשיות</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#fdba74', fontWeight: 700 }}>עמלת סליקה</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fdba74' }}>₪{clearingFee.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <input
                type="number" step="0.1" value={clearingInput}
                onChange={e => setClearingInput(e.target.value)}
                style={{ width: 48, padding: '1px 4px', borderRadius: 4, border: 'none', fontSize: 11, textAlign: 'center' }}
              />
              % מאשראי ₪{creditCardGross.toFixed(0)}
              {clearingInput !== String(clearingPercent) && (
                <button onClick={saveClearingPercent} style={{ background: '#fdba74', border: 'none', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>💾</button>
              )}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 700 }}>קניות סחורה (קבלות מלאי)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#c4b5fd' }}>₪{inventoryExpensesTotal.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>נספר בתזרים, לא ברווח התפעולי (העלות כבר פר-מוצר)</div>
          </div>
          <div style={{ background: operatingProfit >= 0 ? 'rgba(110,231,183,0.18)' : 'rgba(252,165,165,0.18)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>📈 רווח תפעולי</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: operatingProfit >= 0 ? '#6ee7b7' : '#fca5a5' }}>
              {operatingProfit >= 0 ? '+' : ''}₪{operatingProfit.toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>רווח אתר + offline − שיווק/מנויים − סליקה</div>
          </div>
          <div style={{ background: cashBalance >= 0 ? 'rgba(110,231,183,0.18)' : 'rgba(252,165,165,0.18)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>💵 מאזן תזרים (כסף נכנס − יצא)</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: cashBalance >= 0 ? '#6ee7b7' : '#fca5a5' }}>
              {cashBalance >= 0 ? '+' : ''}₪{cashBalance.toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>נכנס ₪{cashIn.toFixed(0)} − יצא ₪{cashOut.toFixed(0)} (כולל קניות סחורה)</div>
          </div>
        </div>
      </div>

      {/* ── טבלת הכנסות ידניות בטווח ── */}
      {!financeLoading && incomesInRange.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>💚 הכנסות offline בתקופה ({incomesInRange.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                  <th style={{ padding: 8, textAlign: 'right' }}>תאריך</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>תיאור</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>אמצעי</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>סכום</th>
                  <th style={{ padding: 8, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {incomesInRange.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{inc.date}</td>
                    <td style={{ padding: 8 }}>{inc.description || '—'}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{METHOD_LABELS[inc.method] ?? inc.method}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: '#059669' }}>₪{inc.amount.toFixed(0)}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <button onClick={() => deleteIncome(inc.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── טבלת ניהול הוצאות ── */}
      {!financeLoading && expenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>💸 הוצאות מוגדרות ({expenses.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
                  <th style={{ padding: 8, textAlign: 'right' }}>תאריך / יום חיוב</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>קטגוריה</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>תיאור</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>סוג</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>סכום בסיס</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>בתקופה הנבחרת</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>קבלה</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const occs = expenseOccurrencesInRange(exp, rangeFrom, rangeTo).filter(o => isDateInEra(o.date, era));
                  const inRangeSum = occs.reduce((s, o) => s + o.amount, 0);
                  const currentMk = monthKeyOf(new Date());
                  const hasOverride = exp.recurring && exp.overrides?.[currentMk] != null;
                  return (
                    <tr key={exp.id} style={{ borderBottom: '1px solid #eee', opacity: occs.length === 0 ? 0.55 : 1 }}>
                      <td style={{ padding: 8 }}>
                        {exp.recurring ? `כל חודש ב-${new Date(exp.date + 'T12:00:00').getDate()} (מ-${exp.date})` : exp.date}
                      </td>
                      <td style={{ padding: 8 }}>
                        <select
                          value={EXPENSE_CATEGORIES.includes(exp.category as typeof EXPENSE_CATEGORIES[number]) ? exp.category : 'אחר'}
                          onChange={ev => changeExpenseCategory(exp, ev.target.value)}
                          title="שינוי קטגוריה — משפיע על החישוב: סחורה מספק נספרת בתזרים בלבד, שאר הקטגוריות מנוכות מהרווח התפעולי"
                          style={{ padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 12, maxWidth: 150, background: '#fff', cursor: 'pointer' }}
                        >
                          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        {[exp.description, exp.supplier ? `ספק: ${exp.supplier}` : '', exp.invoiceNumber ? `#${exp.invoiceNumber}` : ''].filter(Boolean).join(' | ') || '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {exp.source === 'inventory'
                          ? <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>📦 סחורה</span>
                          : exp.recurring
                            ? <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>🔁 קבועה{hasOverride ? ' *' : ''}</span>
                            : <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>חד-פעמית</span>}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>₪{exp.amount.toFixed(0)}{exp.recurring && <span style={{ fontSize: 10, color: '#9ca3af' }}> /חודש</span>}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: inRangeSum > 0 ? '#dc2626' : '#9ca3af' }}>
                        {inRangeSum > 0 ? `₪${inRangeSum.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        {exp.receiptUrl ? (
                          <a href={exp.receiptUrl} target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>👁 צפה</a>
                        ) : (
                          <label style={{ cursor: 'pointer', color: '#0369a1', fontSize: 12, fontWeight: 700 }}>
                            📎 צרף
                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => attachReceiptToExpense(exp, e)} disabled={uploadingReceipt} />
                          </label>
                        )}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button onClick={() => editExpenseBaseAmount(exp)} title="עריכת סכום בסיס"
                          style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', fontSize: 12, cursor: 'pointer', marginLeft: 4 }}>✏️</button>
                        {exp.recurring && (
                          <button onClick={() => editExpenseMonthAmount(exp)} title="סכום שונה לחודש הנוכחי בלבד"
                            style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer', marginLeft: 4, fontWeight: 700, color: '#1d4ed8' }}>✏️ חודש נוכחי</button>
                        )}
                        <button onClick={() => deleteExpense(exp.id)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            * = לחודש הנוכחי הוגדר סכום שונה. שורות דהויות = ללא חיוב בתקופה הנבחרת.
          </div>
        </div>
      )}

      {/* ── טבלת רווחיות פר-מוצר (קיימת) ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>מוצר</th>
              <th style={{ padding: 10, textAlign: 'center' }}>מכירות</th>
              <th style={{ padding: 10, textAlign: 'center' }}>הכנסות נטו</th>
              <th style={{ padding: 10, textAlign: 'center' }}>עלויות</th>
              <th style={{ padding: 10, textAlign: 'center' }}>רווח תזרימי</th>
              <th style={{ padding: 10, textAlign: 'center' }}>רווח אחרי מע״מ</th>
              <th style={{ padding: 10, textAlign: 'center' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {profitData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                  אין נתונים לתקופה שנבחרה
                </td>
              </tr>
            ) : profitData.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee', opacity: p.noCost ? 0.6 : 1 }}>
                <td style={{ padding: 10 }}>
                  {p.name.slice(0, 40)}
                  {p.noCost && <span style={{ fontSize: 10, color: '#999', marginRight: 4 }}>(אין עלות)</span>}
                </td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700 }}>{p.sold}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>₪{p.revenue.toFixed(0)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>₪{p.cost.toFixed(0)}</td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: p.profit >= 0 ? '#059669' : '#dc2626' }}>
                  ₪{p.profit.toFixed(0)}
                </td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, color: p.profitAfterVat >= 0 ? '#16a34a' : '#dc2626' }}>
                  ₪{p.profitAfterVat.toFixed(0)}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
