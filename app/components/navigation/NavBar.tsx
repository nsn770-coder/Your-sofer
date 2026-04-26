"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useCart } from "@/app/contexts/CartContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useShaliach } from "@/app/contexts/ShaliachContext";
import MobileDrawerMenu from "./MobileDrawerMenu";

interface NavSubItem {
  label: string;
  cat: string;
  filter?: string;
}

interface NavColumn {
  title: string;
  items: NavSubItem[];
}

interface NavMenuItem {
  id: string;
  label: string;
  cat: string;
  columns: NavColumn[];
}

const MEGA_MENU_DATA: NavMenuItem[] = [
  {
    id: "mezuzot", label: "מזוזות", cat: "מזוזות",
    columns: [
      {
        title: "לפי חומר",
        items: [
          { label: "כל המזוזות", cat: "מזוזות" },
          { label: "פולימר", cat: "מזוזות", filter: "פולימר" },
          { label: "בטון וסמנט", cat: "מזוזות", filter: "בטון" },
          { label: "פלסטיק", cat: "מזוזות", filter: "פלסטיק" },
          { label: "אלומיניום", cat: "מזוזות", filter: "אלומיניום" },
          { label: "מתכת", cat: "מזוזות", filter: "מתכת" },
          { label: "עץ", cat: "מזוזות", filter: "עץ" },
          { label: "זכוכית", cat: "מזוזות", filter: "זכוכית" },
          { label: "שיש", cat: "מזוזות", filter: "שיש" },
        ]
      },
      {
        title: "לפי גודל",
        items: [
          { label: '7 ס"מ', cat: "מזוזות", filter: '7 ס"מ' },
          { label: '10 ס"מ', cat: "מזוזות", filter: '10 ס"מ' },
          { label: '12 ס"מ', cat: "מזוזות", filter: '12 ס"מ' },
          { label: '15 ס"מ', cat: "מזוזות", filter: '15 ס"מ' },
          { label: '20 ס"מ', cat: "מזוזות", filter: '20 ס"מ' },
          { label: '25 ס"מ', cat: "מזוזות", filter: '25 ס"מ' },
          { label: '30 ס"מ', cat: "מזוזות", filter: '30 ס"מ' },
        ]
      },
      {
        title: "קלפי מזוזה",
        items: [
          { label: "כל הקלפים", cat: "קלפי מזוזה" },
          { label: '10 ס"מ', cat: "קלפי מזוזה", filter: '10 ס"מ' },
          { label: '12 ס"מ', cat: "קלפי מזוזה", filter: '12 ס"מ' },
          { label: '15 ס"מ', cat: "קלפי מזוזה", filter: '15 ס"מ' },
          { label: '20 ס"מ', cat: "קלפי מזוזה", filter: '20 ס"מ' },
        ]
      },
    ],
  },
  {
    id: "tefillin", label: "תפילין", cat: "תפילין קומפלט",
    columns: [
      {
        title: "תפילין קומפלט",
        items: [
          { label: "כל התפילין", cat: "תפילין קומפלט" },
          { label: "אשכנז", cat: "תפילין קומפלט", filter: "אשכנז" },
          { label: "ספרד", cat: "תפילין קומפלט", filter: "ספרד" },
          { label: 'חב"ד', cat: "תפילין קומפלט", filter: 'חב"ד' },
          { label: "תימני", cat: "תפילין קומפלט", filter: "תימני" },
        ]
      },
      {
        title: "כיסויי תפילין",
        items: [
          { label: "כל הכיסויים", cat: "כיסוי תפילין" },
          { label: "דמוי עור", cat: "כיסוי תפילין", filter: "דמוי עור" },
          { label: "עור", cat: "כיסוי תפילין", filter: "עור" },
          { label: "טרמי", cat: "כיסוי תפילין", filter: "טרמי" },
          { label: "פיוו", cat: "כיסוי תפילין", filter: "פיוו" },
          { label: "קטיפה", cat: "כיסוי תפילין", filter: "קטיפה" },
          { label: "פשטן", cat: "כיסוי תפילין", filter: "פשטן" },
          { label: "ורשי", cat: "כיסוי תפילין", filter: "ורשי" },
        ]
      },
      {
        title: "קלפי תפילין",
        items: [
          { label: "כל הנוסחאות", cat: "קלפי תפילין" },
          { label: "אשכנז", cat: "קלפי תפילין", filter: "אשכנז" },
          { label: "ספרד", cat: "קלפי תפילין", filter: "ספרד" },
          { label: 'חב"ד', cat: "קלפי תפילין", filter: 'חב"ד' },
          { label: "תימני", cat: "קלפי תפילין", filter: "תימני" },
        ]
      },
    ],
  },
  {
    id: "tikim", label: "תיקי טלית ותפילין", cat: "תיקי טלית ותפילין",
    columns: [
      {
        title: "תיקי טלית",
        items: [
          { label: "כל התיקים", cat: "תיקי טלית ותפילין" },
          { label: "דמוי עור", cat: "תיקי טלית ותפילין", filter: "דמוי עור" },
          { label: "פשתן", cat: "תיקי טלית ותפילין", filter: "פשתן" },
          { label: "קורדרוי", cat: "תיקי טלית ותפילין", filter: "קורדרוי" },
          { label: "פיוו", cat: "תיקי טלית ותפילין", filter: "פיוו" },
        ]
      },
      {
        title: "לפי גודל",
        items: [
          { label: "תיק גדול", cat: "תיקי טלית ותפילין", filter: "גדול" },
          { label: "תיק קטן", cat: "תיקי טלית ותפילין", filter: "קטן" },
        ]
      },
    ],
  },
  {
    id: "kipot", label: "כיפות", cat: "כיפות",
    columns: [
      {
        title: "כיפות",
        items: [
          { label: "כל הכיפות", cat: "כיפות" },
          { label: "סרוגות", cat: "כיפות", filter: "סרוגות" },
          { label: "עור", cat: "כיפות", filter: "עור" },
          { label: "קטיפה", cat: "כיפות", filter: "קטיפה" },
          { label: "בד", cat: "כיפות", filter: "בד" },
        ]
      },
    ],
  },
  {
    id: "judaica", label: "יודאיקה", cat: "יודאיקה",
    columns: [
      {
        title: "יודאיקה",
        items: [
          { label: "כל היודאיקה", cat: "יודאיקה" },
          { label: "נטלות", cat: "יודאיקה", filter: "נטילת ידיים" },
          { label: "כסף", cat: "יודאיקה", filter: "כסף" },
          { label: "זכוכית", cat: "יודאיקה", filter: "זכוכית" },
          { label: "הבדלה", cat: "יודאיקה", filter: "הבדלה" },
          { label: "חנוכיות", cat: "יודאיקה", filter: "חנוכיות" },
        ]
      },
      {
        title: "ספרים ומגילות",
        items: [
          { label: "מגילות", cat: "מגילות" },
          { label: "ספרי תורה", cat: "ספרי תורה" },
        ]
      },
    ],
  },
  {
    id: "hosting", label: "כלי שולחן והגשה", cat: "כלי שולחן והגשה",
    columns: [
      {
        title: "כלי הגשה",
        items: [
          { label: "כל כלי ההגשה", cat: "כלי שולחן והגשה" },
          { label: "מגשים", cat: "כלי שולחן והגשה", filter: "מגשים" },
          { label: "כוסות", cat: "כלי שולחן והגשה", filter: "כוסות" },
          { label: "צלחות וקערות", cat: "כלי שולחן והגשה", filter: "צלחות וקערות" },
          { label: "קנקנים", cat: "כלי שולחן והגשה", filter: "קנקנים" },
          { label: "ספלים", cat: "כלי שולחן והגשה", filter: "ספלים" },
          { label: "מערכות אוכל", cat: "כלי שולחן והגשה", filter: "מערכות אוכל" },
        ]
      },
      {
        title: "לפי חג",
        items: [
          { label: "שבת", cat: "כלי שולחן והגשה", filter: "שבת" },
          { label: "פסח", cat: "כלי שולחן והגשה", filter: "פסח" },
          { label: "חנוכה", cat: "כלי שולחן והגשה", filter: "חנוכה" },
        ]
      },
    ],
  },
  {
    id: "decor", label: "עיצוב הבית", cat: "עיצוב הבית",
    columns: [
      {
        title: "עיצוב הבית",
        items: [
          { label: "כל עיצוב הבית", cat: "עיצוב הבית" },
          { label: "פמוטים", cat: "עיצוב הבית", filter: "פמוטים" },
          { label: "אגרטלים", cat: "עיצוב הבית", filter: "אגרטלים" },
          { label: "מראות", cat: "עיצוב הבית", filter: "מראות" },
          { label: "נרות ריחניים", cat: "עיצוב הבית", filter: "נרות ריחניים" },
          { label: "קישוטים", cat: "עיצוב הבית", filter: "קישוטים" },
        ]
      },
      {
        title: "עוד",
        items: [
          { label: "מסגרות תמונה", cat: "עיצוב הבית", filter: "מסגרות תמונה" },
          { label: "מעמדות לנר", cat: "עיצוב הבית", filter: "מעמדות לנר" },
          { label: "קופסאות תכשיטים", cat: "עיצוב הבית", filter: "קופסאות תכשיטים" },
        ]
      },
    ],
  },
];

const SIMPLE_NAV = [
  { label: "שבתות וחגים", action: "shabbat-holidays" },
  { label: "ספרי תורה", action: "sifrei-torah" },
  { label: "מגילות", action: "megilot" },
];

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut", staggerChildren: 0.04, delayChildren: 0.04 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: "easeIn" } },
};
const colVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, x: 3 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" } },
};

function MegaPanel({ item, onSelect }: { item: NavMenuItem; onSelect: (cat: string, filter?: string) => void }) {
  return (
    <motion.div variants={menuVariants} initial="hidden" animate="visible" exit="exit"
      style={{ position: "absolute", top: "calc(100% + 4px)", right: "50%", transform: "translateX(50%)", zIndex: 200, minWidth: 520, maxWidth: 860 }}
      onMouseDown={e => e.preventDefault()}
    >
      <div style={{ position: "absolute", top: -5, right: "50%", transform: "translateX(50%) rotate(45deg)", width: 10, height: 10, background: "#1a2a4a", borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" }} />
      <div style={{ background: "linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(184,151,42,0.15)", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "row-reverse", padding: "24px 24px 16px" }}>
          {item.columns.map((col, ci) => (
            <motion.div key={ci} variants={colVariants} style={{ flex: 1, minWidth: 140, padding: "0 16px", borderLeft: ci < item.columns.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#b8972a", textTransform: "uppercase", textAlign: "right", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(184,151,42,0.2)" }}>{col.title}</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {col.items.map((sub, si) => (
                  <motion.li key={si} variants={itemVariants}>
                    <button onClick={() => onSelect(sub.cat, sub.filter)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%", padding: "7px 8px", borderRadius: 7, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "right", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,151,42,0.12)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                    >
                      {sub.label}
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#b8972a", flexShrink: 0, opacity: 0.6 }} />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <div style={{ padding: "10px 24px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => onSelect(item.cat)} style={{ fontSize: 12, color: "#b8972a", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>הכל {item.label} ←</button>
        </div>
      </div>
    </motion.div>
  );
}

function NavBarContent() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { count } = useCart();
  const { user, signInWithGoogle, logout } = useAuth();
  const { shaliach } = useShaliach();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setActiveId(null); setMobileOpen(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleEnter = useCallback((id: string) => {
    clearTimers();
    openTimer.current = setTimeout(() => setActiveId(id), 80);
  }, []);

  const handleLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setActiveId(null), 150);
  }, []);

  function handleSelect(cat: string, filter?: string) {
    setActiveId(null);
    setMobileOpen(false);
    let url = `/category/${encodeURIComponent(cat)}`;
    if (filter) url += `?filter=${encodeURIComponent(filter)}`;
    router.push(url);
  }

  function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleAction(action: string) {
    setMobileOpen(false);
    if (action === "shabbat-holidays") router.push("/category/שבתות-וחגים");
    else if (action === "sifrei-torah") router.push("/category/ספרי תורה");
    else if (action === "megilot") router.push("/category/מגילות");
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif" }}>

      {shaliach && (
        <div style={{ background: "linear-gradient(135deg, #0c1a35 0%, #1a3a6a 100%)", borderBottom: "3px solid #b8972a", padding: isMobile ? "8px 12px" : "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {shaliach.logoUrl
              ? <img src={shaliach.logoUrl} alt="" style={{ width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: 10, objectFit: "cover", border: "2px solid #b8972a" }} />
              : <div style={{ width: 48, height: 48, borderRadius: 10, background: "#b8972a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✡</div>
            }
            <div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, color: "#fff" }}>
                {shaliach.chabadName || shaliach.name}{shaliach.rabbiName && ` · ${shaliach.rabbiName}`}
              </div>
            </div>
          </div>
          {shaliach.phone && (
            <a href={`https://wa.me/972${shaliach.phone.replace(/\D/g, "").slice(1)}`} target="_blank" rel="noopener noreferrer"
              style={{ background: "#25D366", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              📲 צור קשר
            </a>
          )}
        </div>
      )}

      <header style={{ background: "#0c1a35", color: "#fff", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 12px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "#fff", padding: "6px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }} aria-label="פתח תפריט">
            <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
          </button>

          <div onClick={() => router.push("/")} style={{ cursor: "pointer", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <img src="/logo.png" alt="logo" width={56} height={56} style={{ height: isMobile ? 26 : 32, width: "auto", objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
            <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5, whiteSpace: "nowrap" }}>Your Sofer</div>
          </div>

          <div style={{ flex: 1, display: "flex", borderRadius: 8, overflow: "hidden", minWidth: 0 }}>
            {!isMobile && (
              <select style={{ background: "#e8e8e8", border: "none", padding: "10px 8px", fontSize: 12, color: "#333", cursor: "pointer", borderRadius: "0 8px 8px 0", minWidth: 110 }}>
                <option>כל הקטגוריות</option>
              </select>
            )}
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={isMobile ? "חיפוש..." : "חיפוש סת\"מ ויודאיקה..."}
              style={{ flex: 1, border: "none", padding: "10px", fontSize: isMobile ? 13 : 14, color: "#fff", background: "rgba(255,255,255,0.12)", outline: "none", minWidth: 0 }} />
            <button onClick={handleSearch} style={{ background: "#b8972a", border: "none", padding: "0 14px", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {user.photoURL && !isMobile && <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #b8972a" }} />}
                {!isMobile && <div style={{ fontSize: 11 }}><div style={{ color: "#ccc", fontSize: 10 }}>שלום,</div><div style={{ fontWeight: 700 }}>{user.displayName?.split(" ")[0]}</div></div>}
                {user.role === "admin" && <button onClick={() => router.push("/admin")} style={{ background: "#b8972a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>ניהול</button>}
                {user.role === "sofer" && <button onClick={() => router.push("/sofer-dashboard")} style={{ background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>סופר</button>}
                {user.role === "shaliach" && <button onClick={() => router.push("/shaliach-dashboard")} style={{ background: "none", color: "#fff", border: "1px solid #b8972a", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>שלוחה</button>}
                {!isMobile && <button onClick={logout} style={{ background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer" }}>יציאה</button>}
              </div>
            ) : (
              <button onClick={signInWithGoogle} style={{ background: "none", border: "1px solid #444", borderRadius: 6, padding: isMobile ? "4px 7px" : "5px 8px", color: "#fff", fontSize: isMobile ? 10 : 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                {isMobile ? "כניסה" : "התחבר"}
              </button>
            )}
            <div onClick={() => router.push("/cart")} style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ position: "relative" }}>
                <svg width={isMobile ? 26 : 30} height={isMobile ? 26 : 30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {count > 0 && <span style={{ position: "absolute", top: -4, left: -4, background: "#b8972a", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>סל ({count})</div>
            </div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ background: "#162444", borderTop: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center" }}>
              {MEGA_MENU_DATA.map(item => (
                <div key={item.id} style={{ position: "relative" }}
                  onMouseEnter={() => handleEnter(item.id)}
                  onMouseLeave={handleLeave}
                >
                  <button onClick={() => handleSelect(item.cat)} style={{ background: "none", border: "none", color: activeId === item.id ? "#b8972a" : "#fff", padding: "9px 13px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: activeId === item.id ? 700 : 400, borderBottom: activeId === item.id ? "2px solid #b8972a" : "2px solid transparent", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
                    {item.label}
                    <motion.span animate={{ rotate: activeId === item.id ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ fontSize: 9, color: "#b8972a" }}>▾</motion.span>
                  </button>
                  <AnimatePresence>
                    {activeId === item.id && <MegaPanel item={item} onSelect={handleSelect} />}
                  </AnimatePresence>
                </div>
              ))}
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
              {SIMPLE_NAV.map(nav => (
                <button key={nav.action} onClick={() => handleAction(nav.action)}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: "9px 11px", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", borderBottom: "2px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  {nav.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <MobileDrawerMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        menuData={MEGA_MENU_DATA}
        simpleNav={SIMPLE_NAV}
        onSelect={handleSelect}
        onAction={handleAction}
        user={user}
        signInWithGoogle={signInWithGoogle}
        logout={logout}
      />
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/ops')) return null;
  return <NavBarContent />;
}
