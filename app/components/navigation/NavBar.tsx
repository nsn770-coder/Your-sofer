"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useRouter, usePathname } from "next/navigation";

import { useCart } from "@/app/contexts/CartContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useShaliach } from "@/app/contexts/ShaliachContext";
import MobileDrawerMenu from "./MobileDrawerMenu";
import lifeEvents from "@/data/lifeEvents";
import AlgoliaSearch from "@/app/components/search/AlgoliaSearch";
import CouponStrip from "@/app/components/CouponStrip";

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
    id: "mezuzot", label: "בתי מזוזה", cat: "בתי מזוזה",
    columns: [
      {
        title: "קלפי מזוזה",
        items: [
          { label: "כל הקלפים",  cat: "קלפי מזוזה" },
          { label: '10 ס"מ',    cat: "קלפי מזוזה", filter: '10 ס"מ' },
          { label: '12 ס"מ',    cat: "קלפי מזוזה", filter: '12 ס"מ' },
          { label: '15 ס"מ',    cat: "קלפי מזוזה", filter: '15 ס"מ' },
          { label: '20 ס"מ',    cat: "קלפי מזוזה", filter: '20 ס"מ' },
        ],
      },
      {
        title: "בתי מזוזה",
        items: [
          { label: "כל בתי המזוזה", cat: "בתי מזוזה" },
          { label: "מזוזות פולימר",  cat: "בתי מזוזה", filter: "מזוזות פולימר" },
          { label: "מזוזות מתכת",    cat: "בתי מזוזה", filter: "מזוזות מתכת" },
          { label: "מזוזות פלסטיק",  cat: "בתי מזוזה", filter: "מזוזות פלסטיק" },
          { label: "מזוזות זכוכית",  cat: "בתי מזוזה", filter: "מזוזות זכוכית" },
          { label: "מזוזות עץ",      cat: "בתי מזוזה", filter: "מזוזות עץ" },
        ],
      },
    ],
  },
  {
    id: "tefillin", label: "תפילין", cat: "תפילין קומפלט",
    columns: [
      {
        title: "קלפים",
        items: [
          { label: "קלפי מזוזה",    cat: "קלפי מזוזה" },
          { label: "קלפי תפילין",   cat: "קלפי תפילין" },
          { label: "תפילין קומפלט", cat: "תפילין קומפלט" },
        ],
      },
      {
        title: "סטים ותיקים",
        items: [
          { label: "כל הסטים",           cat: "סט טלית תפילין" },
          { label: "סטים עור מדומה",     cat: "סט טלית תפילין",   filter: "סטים עור מדומה" },
          { label: "תיקים טרמי",         cat: "סט טלית תפילין",   filter: "תיקים טרמי" },
          { label: "בתי תפילין",         cat: "סט טלית תפילין",   filter: "בתי תפילין" },
        ],
      },
      {
        title: "טלית וציצית",
        items: [
          { label: "טליתות וציציות", cat: "טליתות וציציות" },
          { label: "גופיות ציצית",  cat: "טליתות וציציות", filter: "גופיות ציצית" },
          { label: "טליתות",        cat: "טליתות וציציות", filter: "טליתות" },
        ],
      },
    ],
  },
  {
    id: "tikim", label: "תיקי טלית ותפילין", cat: "תיקי טלית ותפילין",
    columns: [
      {
        title: "תיקי טלית ותפילין",
        items: [
          { label: "כל התיקים", cat: "תיקי טלית ותפילין" },
        ],
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
        ],
      },
    ],
  },
  {
    id: "shabbat", label: "שבת", cat: "שבת",
    columns: [
      {
        title: "שבת",
        items: [
          { label: "כל שבת",         cat: "שבת" },
          { label: "פמוטים",         cat: "שבת", filter: "פמוטים" },
          { label: "כיסויי חלה",    cat: "שבת", filter: "כיסויי חלה" },
          { label: "כוסות קידוש",   cat: "שבת", filter: "כוסות קידוש" },
          { label: "מלחיות ומצתים", cat: "שבת", filter: "מצתים, מלחיות ומתקנים לגפרורים" },
          { label: "קרשי חלה",      cat: "שבת", filter: "קרשי חלה, סכינים ומפיונים" },
          { label: "כיסויי פלטה",   cat: "שבת", filter: "כיסויי פלטה" },
          { label: "חתן וכלה",      cat: "שבת", filter: "חתן וכלה" },
        ],
      },
    ],
  },
  {
    id: "judaica", label: "יודאיקה", cat: "יודאיקה",
    columns: [
      {
        title: "יומיומי",
        items: [
          { label: "כל היודאיקה",    cat: "יודאיקה" },
          { label: "נטלות",          cat: "יודאיקה", filter: "נטילת ידיים ומים אחרונים" },
          { label: "ברכונים",        cat: "יודאיקה", filter: "ברכונים" },
          { label: "מחזיקי מפתחות", cat: "יודאיקה", filter: "מחזיקי מפתחות" },
          { label: "קופות צדקה",    cat: "יודאיקה", filter: "קופות צדקה" },
          { label: "הבדלה",         cat: "יודאיקה", filter: "הבדלה" },
          { label: "דמויות חסידים", cat: "יודאיקה", filter: "דמויות חסידים" },
          { label: "חמסות וסגולות", cat: "יודאיקה", filter: "חמסות וסגולות" },
        ],
      },
      {
        title: "חגים",
        items: [
          { label: "פסח",      cat: "יודאיקה", filter: "פסח" },
          { label: "חנוכה",    cat: "יודאיקה", filter: "חנוכה" },
          { label: "חנוכיות",  cat: "יודאיקה", filter: "חנוכיות" },
          { label: "ראש השנה", cat: "יודאיקה", filter: "ראש השנה" },
          { label: "פורים",    cat: "יודאיקה", filter: "פורים" },
          { label: "סוכות",    cat: "יודאיקה", filter: "סוכות" },
        ],
      },
      {
        title: "עוד",
        items: [
          { label: "סטים ומארזים", cat: "יודאיקה", filter: "סטים ומארזים" },
          { label: "מגנטים",      cat: "יודאיקה", filter: "מגנטים" },
          { label: "עטים",        cat: "יודאיקה", filter: "עטים" },
        ],
      },
    ],
  },
  {
    id: "jewelry", label: "תכשיטים", cat: "תכשיטים",
    columns: [
      {
        title: "תכשיטים",
        items: [
          { label: "כל התכשיטים", cat: "תכשיטים" },
        ],
      },
    ],
  },
  {
    id: "synagogue", label: "מוצרי בית כנסת", cat: "מוצרי בית כנסת",
    columns: [
      {
        title: "מוצרי בית כנסת",
        items: [
          { label: "כל המוצרים", cat: "מוצרי בית כנסת" },
        ],
      },
    ],
  },
  {
    id: "books", label: "ספרי קודש וסידורים", cat: "ספרי קודש וסידורים",
    columns: [
      {
        title: "ספרי קודש וסידורים",
        items: [
          { label: "כל הספרים",       cat: "ספרי קודש וסידורים" },
          { label: "סידורים ותהילים", cat: "ספרי קודש וסידורים", filter: "סידורים ותהילים" },
        ],
      },
    ],
  },
];

const SIMPLE_NAV = [
  { label: "ביקורות", action: "reviews" },
  { label: "קולקציות", action: "collections" },
  { label: "הסיפור שלנו", action: "about" },
  { label: "שאלות ותשובות", action: "faq" },
  { label: "צור קשר", action: "contact" },
];

function MegaPanel({ item, onSelect }: { item: NavMenuItem; onSelect: (cat: string, filter?: string) => void }) {
  return (
    <>
      <style>{`@keyframes navMegaIn{from{opacity:0;transform:translateX(50%) translateY(-8px) scale(0.98)}to{opacity:1;transform:translateX(50%) translateY(0) scale(1)}}`}</style>
      <div
        style={{ position: "absolute", top: "calc(100% + 4px)", right: "50%", transform: "translateX(50%)", zIndex: 200, minWidth: 520, maxWidth: 860, animation: "navMegaIn 0.2s ease-out" }}
        onMouseDown={e => e.preventDefault()}
      >
        <div style={{ position: "absolute", top: -5, right: "50%", transform: "translateX(50%) rotate(45deg)", width: 10, height: 10, background: "#1a1a1a", borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" }} />
        <div style={{ background: "#1a1a1a", borderRadius: 0, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,151,42,0.12)", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "row-reverse", padding: "24px 24px 16px" }}>
            {item.columns.map((col, ci) => (
              <div key={ci} style={{ flex: 1, minWidth: 140, padding: "0 16px", borderLeft: ci < item.columns.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", textAlign: "right", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(197,160,40,0.5)" }}>{col.title}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {col.items.map((sub, si) => (
                    <li key={si}>
                      <button onClick={() => onSelect(sub.cat, sub.filter)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%", padding: "7px 8px", borderRadius: 0, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "right", fontFamily: "inherit", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,151,42,0.12)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                      >
                        {sub.label}
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#C5A028", flexShrink: 0, opacity: 0.6 }} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 24px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => onSelect(item.cat)} style={{ fontSize: 12, color: "#C5A028", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>הכל {item.label} ←</button>
          </div>
        </div>
      </div>
    </>
  );
}

function NavBarContent() {
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [kipotSubcats, setKipotSubcats] = useState<Array<{ slug: string; displayName: string; priority?: number }>>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'categories'), where('parentCategory', '==', 'כיפות')))
      .then(snap => {
        const docs = snap.docs
          .map(d => d.data() as { slug: string; displayName: string; priority?: number })
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setKipotSubcats(docs);
      })
      .catch((e) => console.error('Failed to load kippot subcategories:', e));
  }, []);

  const menuData = useMemo<NavMenuItem[]>(() => {
    const allItems: NavSubItem[] = [
      { label: 'כל הכיפות', cat: 'כיפות' },
      ...kipotSubcats.map(s => ({ label: s.displayName, cat: 'כיפות', filter: s.slug })),
    ];
    const mid = Math.ceil(allItems.length / 2);
    const kipotEntry: NavMenuItem = {
      id: 'kipot', label: 'כיפות', cat: 'כיפות',
      columns: allItems.length <= 6
        ? [{ title: 'כיפות', items: allItems }]
        : [
            { title: 'כיפות', items: allItems.slice(0, mid) },
            { title: 'עוד',   items: allItems.slice(mid) },
          ],
    };
    return MEGA_MENU_DATA.map(item => (item.id === 'kipot' ? kipotEntry : item));
  }, [kipotSubcats]);
  const openTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    const h = () => setMobileOpen(true);
    window.addEventListener("openMobileMenu", h);
    return () => window.removeEventListener("openMobileMenu", h);
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

  function handleMoment(id: string) {
    setMobileOpen(false);
    router.push(`/moment/${id}`);
  }

  function handleAction(action: string) {
    setMobileOpen(false);
    if (action === "shabbat-holidays") router.push("/category/שבתות-וחגים");
    else if (action === "sifrei-torah") router.push("/category/ספרי תורה");
    else if (action === "megilot") router.push("/category/מגילות");
    else if (action === "bar-mitzva") router.push("/bar-mitzva");
    else if (action === "collections") router.push("/collections");
    else if (action === "promo-2plus1") router.push("/promo/2plus1");
    else if (action === "bundles") router.push("/bundles");
    else if (action === "reviews") router.push("/reviews");
    else if (action === "about") router.push("/about");
    else if (action === "faq") router.push("/faq");
    else if (action === "contact") router.push("/contact");
    else if (action === "print-order") router.push("/print-order");
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`
        .ys-nav-logo { height: 32px; }
        @media (max-width: 1023px) { .ys-nav-logo { height: 26px; } }
      `}</style>

      {shaliach && (
        <div style={{ background: "#1a1a1a", borderBottom: "3px solid #C5A028", padding: isMobile ? "8px 12px" : "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {shaliach.logoUrl
              ? <img src={shaliach.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #C5A028", flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#C5A028", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✡</div>
            }
            <div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, color: "#fff" }}>
                {shaliach.chabadName || shaliach.name}{shaliach.rabbiName && ` · ${shaliach.rabbiName}`}
              </div>
            </div>
          </div>
          {shaliach.phone && (
            <a href={`https://wa.me/972${shaliach.phone.replace(/\D/g, "").slice(1)}`} target="_blank" rel="noopener noreferrer"
              style={{ background: "#25D366", color: "#fff", borderRadius: 0, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              📲 צור קשר
            </a>
          )}
        </div>
      )}

      <header style={{ background: "#FAF8F3", color: "#1a1a1a", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid #E7E2D8" }}>
        <CouponStrip />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 12px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "#1a1a1a", padding: "6px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }} aria-label="פתח תפריט">
            <div style={{ width: 20, height: 2, background: "#1a1a1a", borderRadius: 0 }} />
            <div style={{ width: 20, height: 2, background: "#1a1a1a", borderRadius: 0 }} />
            <div style={{ width: 20, height: 2, background: "#1a1a1a", borderRadius: 0 }} />
          </button>

          <div onClick={() => router.push("/")} style={{ cursor: "pointer", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Image src="https://res.cloudinary.com/dyxzq3ucy/image/upload/v1778746370/%D7%A2%D7%95%D7%AA%D7%A7_%D7%A9%D7%9C_%D7%A2%D7%95%D7%AA%D7%A7_%D7%A9%D7%9C_L_ecatchila_1_hrlkhj.png" alt="logo" width={200} height={48} className="ys-nav-logo" style={{ height: 48, width: "auto", objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = "none")} />
            <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "#1a1a1a", letterSpacing: 0.5, whiteSpace: "nowrap" }}>Your Sofer</div>
          </div>

          {/* ── Search area (desktop only) ───────────────────────────── */}
          {isMobile ? (
            <div style={{ flex: 1 }} />
          ) : (
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <AlgoliaSearch onNavigate={() => setActiveId(null)} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {user.photoURL && !isMobile && <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #C5A028" }} />}
                {!isMobile && <div style={{ fontSize: 11 }}><div style={{ color: "#888", fontSize: 10 }}>שלום,</div><div style={{ fontWeight: 700, color: "#1a1a1a" }}>{user.displayName?.split(" ")[0]}</div></div>}
                {user.role === "admin" && <button onClick={() => router.push("/admin")} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 0, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>ניהול</button>}
                {user.role === "sofer" && <button onClick={() => router.push("/sofer-dashboard")} style={{ background: "#1a3a2a", color: "#fff", border: "none", borderRadius: 0, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>סופר</button>}
                {user.role === "shaliach" && <button onClick={() => router.push("/shaliach-dashboard")} style={{ background: "none", color: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 0, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>שלוחה</button>}
                {!isMobile && <button onClick={logout} style={{ background: "none", border: "none", color: "#888", fontSize: 11, cursor: "pointer" }}>יציאה</button>}
              </div>
            ) : (
              <button onClick={signInWithGoogle} style={{ background: "none", border: "1px solid #1a1a1a", borderRadius: 0, padding: isMobile ? "4px 7px" : "5px 8px", color: "#1a1a1a", fontSize: isMobile ? 10 : 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="11" height="11" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                {isMobile ? "כניסה" : "התחבר"}
              </button>
            )}
            <div onClick={() => router.push("/cart")} style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ position: "relative" }}>
                <svg width={isMobile ? 26 : 30} height={isMobile ? 26 : 30} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {count > 0 && <span style={{ position: "absolute", top: -4, left: -4, background: "#C5A028", color: "#1a1a1a", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#1a1a1a", fontWeight: 700 }}>סל ({count})</div>
            </div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ background: "#1a1a1a", borderBottom: "2px solid #C5A028" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#C5A028", letterSpacing: 1.5, padding: "8px 14px 8px 0", borderLeft: "1px solid rgba(255,255,255,0.15)", marginLeft: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                רגעי חיים
              </span>
              {lifeEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => handleMoment(ev.id)}
                  style={{ background: "none", border: "none", borderBottom: "2px solid transparent", color: "rgba(255,255,255,0.82)", padding: "8px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "color 0.15s, border-bottom-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderBottomColor = "#C5A028"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.82)"; e.currentTarget.style.borderBottomColor = "transparent"; }}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isMobile && (
          <div style={{ background: "#FAF8F3", borderTop: "1px solid #E7E2D8", position: "relative" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center" }}>
              {menuData.map(item => (
                <div key={item.id} style={{ position: "relative" }}
                  onMouseEnter={() => handleEnter(item.id)}
                  onMouseLeave={handleLeave}
                >
                  <button onClick={() => handleSelect(item.cat)} style={{ background: "none", border: "none", color: activeId === item.id ? "#C5A028" : "#1a1a1a", padding: "9px 13px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: activeId === item.id ? 700 : 500, borderBottom: activeId === item.id ? "2px solid #C5A028" : "2px solid transparent", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
                    {item.label}
                    <span style={{ fontSize: 9, color: "#C5A028", display: "inline-block", transition: "transform 0.2s ease", transform: activeId === item.id ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </button>
                  {activeId === item.id && <MegaPanel item={item} onSelect={handleSelect} />}
                </div>
              ))}
              <div style={{ width: 1, height: 20, background: "#E7E2D8", margin: "0 4px" }} />
              {SIMPLE_NAV.map(nav => (
                <button key={nav.action} onClick={() => handleAction(nav.action)}
                  style={{ background: "none", border: "none", color: "#555", padding: "9px 11px", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", borderBottom: "2px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#1a1a1a"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#555"; }}
                >
                  {nav.label}
                </button>
              ))}
              <div style={{ marginRight: 'auto' }} />
              <button
                onClick={() => router.push('/soferim')}
                style={{ background: '#EEF3FF', color: '#1a1a1a', border: '1.5px solid #C5D5F0', borderRadius: 12, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}
              >
                הכירו את הסופרים שלנו ←
              </button>
            </div>
          </div>
        )}
      </header>

      <MobileDrawerMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        menuData={menuData}
        simpleNav={SIMPLE_NAV}
        onSelect={handleSelect}
        onAction={handleAction}
        onMoment={handleMoment}
        lifeEvents={lifeEvents}
        user={user}
        signInWithGoogle={signInWithGoogle}
        logout={logout}
      />
    </div>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/ops') || pathname?.startsWith('/bar-mitzvah')) return null;
  return <NavBarContent />;
}
