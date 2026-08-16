"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useRouter, usePathname } from "next/navigation";

import { useCart } from "@/app/contexts/CartContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useShaliach } from "@/app/contexts/ShaliachContext";
import { getTier, getNextTierInfo } from "@/app/lib/loyalty";
import MobileDrawerMenu from "./MobileDrawerMenu";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import lifeEvents from "@/data/lifeEvents";
import AlgoliaSearch from "@/app/components/search/AlgoliaSearch";
// CouponStrip אוחד לתוך AnnouncementBar (08/2026)
import { MEGA_MENU_DATA, type NavMenuItem, type NavSubItem } from "@/data/categoriesMenu";
import { useT } from "@/app/lib/i18n/useT";

// התוויות נשלפות מהמילון לפי מפתח — ראה SIMPLE_NAV בתוך NavBarContent
const SIMPLE_NAV_ACTIONS = ["build", "gifts", "event-kippot", "about", "faq", "contact"] as const;

function MegaPanel({ item, onSelect }: { item: NavMenuItem; onSelect: (cat: string, filter?: string) => void }) {
  const { t, tc, dir } = useT();
  // תווית מתורגמת אם קיימת, אחרת התווית המקורית מהתפריט
  const label = (key: string | undefined, fallback: string) => {
    if (!key) return fallback;
    const x = tc(key);
    return x && x !== key ? x : fallback;
  };
  return (
    <>
      <style>{`@keyframes navMegaIn{from{opacity:0;transform:translateX(50%) translateY(-8px) scale(0.98)}to{opacity:1;transform:translateX(50%) translateY(0) scale(1)}}`}</style>
      <div
        dir={dir}
        style={{ position: "absolute", top: "calc(100% + 4px)", right: "50%", transform: "translateX(50%)", zIndex: 200, minWidth: 520, maxWidth: 860, animation: "navMegaIn 0.2s ease-out" }}
        onMouseDown={e => e.preventDefault()}
      >
        <div style={{ position: "absolute", top: -5, right: "50%", transform: "translateX(50%) rotate(45deg)", width: 10, height: 10, background: "var(--ys-plum)", borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" }} />
        <div style={{ background: "var(--ys-plum)", borderRadius: 0, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,151,42,0.12)", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "row", padding: "24px 24px 16px" }}>
            {item.columns.map((col, ci) => (
              <div key={ci} style={{ flex: 1, minWidth: 140, padding: "0 16px", borderLeft: ci < item.columns.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", textAlign: dir === "rtl" ? "right" : "left", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(197,160,40,0.5)" }}>{label(col.title, col.title)}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {col.items.map((sub, si) => (
                    <li key={si}>
                      <button onClick={() => onSelect(sub.cat, sub.filter)}
                        style={{ display: "flex", alignItems: "center", flexDirection: "row-reverse", justifyContent: "flex-end", gap: 8, width: "100%", padding: "7px 8px", borderRadius: 0, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: dir === "rtl" ? "right" : "left", fontFamily: "inherit", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,151,42,0.12)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                      >
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ys-purple)", flexShrink: 0, opacity: 0.6 }} />
                        {label(sub.filter ?? sub.cat, sub.label)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 24px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => onSelect(item.cat)} style={{ fontSize: 12, color: "var(--ys-on-dark)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{t("nav.allOf").replace("{x}", label(item.cat, item.label))}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function NavBarContent() {
  const { t, tc, dir, def } = useT();
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [kipotSubcats, setKipotSubcats] = useState<Array<{ slug: string; displayName: string; priority?: number }>>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      { label: t('nav.allKippot'), cat: 'כיפות' },
      ...kipotSubcats.map(s => ({ label: s.displayName, cat: 'כיפות', filter: s.slug })),
    ];
    const mid = Math.ceil(allItems.length / 2);
    const kipotEntry: NavMenuItem = {
      id: 'kipot', label: tc('כיפות'), cat: 'כיפות',
      columns: [
        ...(allItems.length <= 6
          ? [{ title: tc('כיפות'), items: allItems }]
          : [
              { title: tc('כיפות'),   items: allItems.slice(0, mid) },
              { title: t('nav.more'), items: allItems.slice(mid) },
            ]),
        { title: t('nav.printing'), items: [{ label: t('nav.eventKippot'), cat: '__event-kippot' }] },
      ],
    };
    return MEGA_MENU_DATA.map(item => {
      if (item.id === 'kipot') return kipotEntry;
      const translated = tc(item.cat);
      return translated && translated !== item.cat ? { ...item, label: translated } : item;
    });
  }, [kipotSubcats, t, tc]);

  // תוויות פריטי הניווט הפשוט — נגזרות מהמילון לפי ה-action
  const SIMPLE_NAV = useMemo(() => {
    const labels: Record<string, string> = {
      'build':        t('nav.buildBundle'),
      'gifts':        t('nav.eventGifts'),
      'event-kippot': t('nav.eventKippot'),
      'about':        t('nav.ourStory'),
      'faq':          t('footer.faq'),
      'contact':      t('footer.contact'),
    };
    return SIMPLE_NAV_ACTIONS.map(action => ({ action, label: labels[action] }));
  }, [t]);
  const openTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingInFromDropdown = useRef(false);
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
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setActiveId(null); setMobileOpen(false); setUserMenuOpen(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // אחרי sign-in מהדרופדאון — הפנה אדמין לדשבורד
  useEffect(() => {
    if (user && signingInFromDropdown.current) {
      signingInFromDropdown.current = false;
      if (user.role === 'admin') router.push('/admin');
    }
  }, [user]);

  // סגור תפריט משתמש בלחיצה מחוץ לו
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [userMenuOpen]);

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
    if (cat === '__event-kippot') { router.push('/event-kippot'); return; }
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
    else if (action === "sale") router.push("/sale");
    else if (action === "bundles") router.push("/bundles");
    else if (action === "reviews") router.push("/reviews");
    else if (action === "about") router.push("/about");
    else if (action === "faq") router.push("/faq");
    else if (action === "contact") router.push("/contact");
    else if (action === "print-order") router.push("/print-order");
    else if (action === "event-kippot") router.push("/event-kippot");
    else if (action === "gifts") router.push("/gifts");
    else if (action === "build") router.push("/build");
  }

  return (
    <div dir={dir} style={{ fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`
        .ys-nav-logo { height: 32px; }
        @media (max-width: 1023px) { .ys-nav-logo { height: 26px; } }
        @keyframes ysUserMenuIn { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .ys-user-menu-item { display:flex; align-items:center; gap:8px; width:100%; padding:9px 16px; background:none; border:none; cursor:pointer; font-size:14px; color:#1a1a1a; text-align:start; font-family:inherit; text-decoration:none; transition:background 0.12s; }
        .ys-user-menu-item:hover { background:#F5F3EE; }
        .ys-user-menu-item-coming { color:#aaa; }
        .ys-user-menu-item-coming:hover { background:none; cursor:default; }
      `}</style>

      {shaliach && (
        <div style={{ background: "var(--ys-plum)", borderBottom: "3px solid var(--ys-purple)", padding: isMobile ? "8px 12px" : "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {shaliach.logoUrl
              ? <img src={shaliach.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--ys-purple)", flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ys-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✡</div>
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
              📲 {t("footer.contact")}
            </a>
          )}
        </div>
      )}

      <header style={{ background: "var(--ys-page)", color: "var(--ys-ink)", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid #E9E4DC" }}>
        {/* CouponStrip הוסר — הקופון הוא כעת המסר השלישי ב-AnnouncementBar */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 12px", display: "flex", alignItems: "center", gap: isMobile ? 6 : 12 }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "var(--ys-ink)", padding: "6px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }} aria-label={t("nav.openMenu")}>
            <div style={{ width: 20, height: 2, background: "var(--ys-plum)", borderRadius: 0 }} />
            <div style={{ width: 20, height: 2, background: "var(--ys-plum)", borderRadius: 0 }} />
            <div style={{ width: 20, height: 2, background: "var(--ys-plum)", borderRadius: 0 }} />
          </button>

          {/* הלוגו צמוד להמבורגר: e_trim חותך את השוליים השקופים של ה-PNG,
              כך שהקופסה מתכווצת לרוחב הסמל האמיתי ולא "צפה" לכיוון מרכז המסך */}
          <div onClick={() => router.push("/")} style={{ cursor: "pointer", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Image src="https://res.cloudinary.com/dyxzq3ucy/image/upload/e_trim/v1778746370/%D7%A2%D7%95%D7%AA%D7%A7_%D7%A9%D7%9C_%D7%A2%D7%95%D7%AA%D7%A7_%D7%A9%D7%9C_L_ecatchila_1_hrlkhj.png" alt="logo" width={200} height={48} className="ys-nav-logo" style={{ height: 48, width: "auto", objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = "none")} />
            <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "var(--ys-ink)", letterSpacing: 0.5, whiteSpace: "nowrap" }}>Your Sofer</div>
          </div>

          {/* ── Search area (desktop only) ───────────────────────────── */}
          {/* CLS FIX: shown/hidden via CSS media query instead of isMobile state,
              which rendered the desktop search on phones for the first paint and
              then removed it after hydration (header height jump on every page). */}
          <div className="hidden lg:block" style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <AlgoliaSearch onNavigate={() => setActiveId(null)} />
          </div>
          <div className="lg:hidden" style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>

            {/* ── בורר שפה (דגלים) ── */}
            <LanguageSwitcher compact={isMobile} />

            {/* ── אייקון משתמש + תפריט נפתח ── */}
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label={t("account.menuAria")}
                style={{ background: "none", border: userMenuOpen ? "1px solid var(--ys-purple)" : "1px solid transparent", borderRadius: 0, padding: "5px 7px", color: "var(--ys-ink)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "border-color 0.15s" }}
              >
                {/* אייקון דמות */}
                <svg width={isMobile ? 22 : 22} height={isMobile ? 22 : 22} viewBox="0 0 24 24" fill="none" stroke="#3B3B41" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {!isMobile && <span style={{ fontSize: 11, fontWeight: user ? 600 : 400, color: "var(--ys-ink)" }}>
                  {user ? (user.firstName || user.displayName?.split(" ")[0] || t("account.short")) : t("nav.login")}
                </span>}
              </button>

              {/* ── דרופדאון ── */}
              {userMenuOpen && (
                <div dir="rtl" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 240, maxWidth: "calc(100vw - 24px)", background: "#fff", border: "1px solid #E7E2D8", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 300, animation: "ysUserMenuIn 0.18s ease-out" }}>

                  {user ? (
                    <>
                      {/* כותרת — שלום + נקודות */}
                      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F0EDE8" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ys-ink)", marginBottom: 8 }}>
                          {t("nav.hello")}, {user.firstName || user.displayName?.split(" ")[0] || t("account.guest")} 👋
                        </div>
                        {/* פס דרגה — מחובר ל-totalSpent אמיתי */}
                        {(() => {
                          const spent = user.totalSpent ?? 0;
                          const pts   = user.loyaltyPoints ?? 0;
                          const tier  = getTier(spent);
                          const next  = getNextTierInfo(spent);
                          return (
                            <>
                              <div style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ color: tier.color, fontWeight: 700 }}>{tier.icon} {tier.label}</span>
                                <span>·</span>
                                <span>{pts.toLocaleString(def.htmlLang)} {t("account.points")}</span>
                              </div>
                              {next.nextTier ? (
                                <>
                                  <div style={{ height: 4, background: "#F0EDE8", overflow: "hidden" }}>
                                    <div style={{ width: `${next.progressPercent}%`, height: "100%", background: tier.color, transition: "width 0.4s" }} />
                                  </div>
                                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{next.progressLabel}</div>
                                </>
                              ) : (
                                <div style={{ fontSize: 10, color: tier.color, marginTop: 3, fontWeight: 600 }}>{t("account.topTier")}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* קישורי חשבון */}
                      <div style={{ padding: "6px 0" }}>
                        <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/account/orders"); }}>
                          <span style={{ fontSize: 15 }}>📦</span> {t("nav.myOrders")}
                        </button>
                        <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/account/loyalty"); }}>
                          <span style={{ fontSize: 15 }}>⭐</span> {t("account.myPoints")}
                        </button>
                        <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/account/club-deals"); }}>
                          <span style={{ fontSize: 15 }}>🏷️</span> {t("account.clubDeals")}
                        </button>
                        <button className="ys-user-menu-item ys-user-menu-item-coming" disabled>
                          <span style={{ fontSize: 15 }}>🔔</span> {t("account.myMessages")}
                          <span style={{ marginRight: "auto", fontSize: 10, color: "var(--ys-on-dark)", border: "1px solid var(--ys-purple)", padding: "1px 5px" }}>{t("account.soon")}</span>
                        </button>
                      </div>

                      <div style={{ height: 1, background: "#F0EDE8" }} />

                      <div style={{ padding: "6px 0" }}>
                        <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/account/profile"); }}>
                          <span style={{ fontSize: 15 }}>👤</span> {t("account.myDetails")}
                        </button>
                        <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/account/addresses"); }}>
                          <span style={{ fontSize: 15 }}>📍</span> {t("account.myAddresses")}
                        </button>
                      </div>

                      {/* קישורי תפקיד — משתמש אחד יכול להחזיק בכמה כובעים
                          במקביל, ולכן כל פאנל נבדק בנפרד לפי המזהה שלו */}
                      {(user.role === "admin" || user.soferId || user.shaliachId || user.partnerId) && (
                        <>
                          <div style={{ height: 1, background: "#F0EDE8" }} />
                          <div style={{ padding: "6px 0" }}>
                            {user.role === "admin" && (
                              <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/admin"); }}>
                                <span style={{ fontSize: 15 }}>⚙️</span> {t("account.adminPanel")}
                              </button>
                            )}
                            {user.soferId && (
                              <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/sofer-dashboard"); }}>
                                <span style={{ fontSize: 15 }}>✍️</span> {t("account.scribePanel")}
                              </button>
                            )}
                            {user.shaliachId && (
                              <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/shaliach-dashboard"); }}>
                                <span style={{ fontSize: 15 }}>🏠</span> {t("account.shaliachPanel")}
                              </button>
                            )}
                            {user.partnerId && (
                              <button className="ys-user-menu-item" onClick={() => { setUserMenuOpen(false); router.push("/partner"); }}>
                                <span style={{ fontSize: 15 }}>🏪</span> {t("account.partnerPanel")}
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      <div style={{ height: 1, background: "#F0EDE8" }} />
                      <div style={{ padding: "6px 0" }}>
                        <button className="ys-user-menu-item" style={{ color: "#888" }} onClick={() => { setUserMenuOpen(false); logout(); }}>
                          <span style={{ fontSize: 15 }}>🚪</span> {t("nav.logout")}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* לא מחובר */
                    <div style={{ padding: "20px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ys-ink)", marginBottom: 4, textAlign: "center" }}>{t("account.signInTitle")}</div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 16, textAlign: "center" }}>{t("account.signInSub")}</div>
                      <button
                        onClick={() => { setUserMenuOpen(false); signingInFromDropdown.current = true; signInWithGoogle(); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", background: "var(--ys-plum)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                        {t("account.continueGoogle")}
                      </button>
                      <div style={{ marginTop: 10, textAlign: "center" }}>
                        <button onClick={() => { setUserMenuOpen(false); router.push("/account/login"); }} style={{ background: "none", border: "none", color: "#888", fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                          {t("account.toLoginPage")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => router.push("/cart")} aria-label={t("nav.cartAria").replace("{n}", String(count))}
              style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, fontFamily: "inherit" }}>
              <div style={{ position: "relative" }}>
                <svg width={isMobile ? 26 : 30} height={isMobile ? 26 : 30} viewBox="0 0 24 24" fill="none" stroke="#3B3B41" strokeWidth="1.8" aria-hidden="true" focusable="false"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {count > 0 && <span aria-hidden="true" style={{ position: "absolute", top: -4, left: -4, background: "var(--ys-purple)", color: "var(--ys-on-dark)", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{count}</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--ys-ink)", fontWeight: 700 }}>{t("nav.cart")} ({count})</div>
            </button>
          </div>
        </div>

        {/* רצועת "רגעי חיים" הוסרה מהכותרת (08/2026) — היא הוסיפה 37px מעל
            הקיפול וכפלה תוכן שכבר קיים כרצועת באנרים בעמוד הבית.
            הניווט לאירועים נשאר דרך /moment/[id] ודרך התפריט במובייל. */}

        {/* CLS FIX (08/2026): הרצועה מוסתרת ב-CSS ולא דרך isMobile.
            isMobile הוא false ב-SSR, ולכן הרצועה נשלחה ב-HTML גם לטלפונים ונמחקה
            אחרי hydration — הכותרת קפצה מ-122px ל-51px וכל העמוד נמשך למעלה, בכל
            עמוד באתר. lg = 1024px, בדיוק ה-breakpoint של isMobile, ולכן המראה
            בדסקטופ ובמובייל זהה לחלוטין — רק בלי הקפיצה.
            אותו דפוס כבר בשימוש למעלה עבור תיבת החיפוש. */}
        <div className="hidden lg:block" style={{ background: "var(--ys-page)", borderTop: "1px solid #E9E4DC", position: "relative" }}>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center" }}>
              <button
                onClick={() => router.push('/sale')}
                style={{ background: 'none', border: 'none', color: '#c0392b', padding: '9px 13px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', fontWeight: 700, borderBottom: '2px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 3 }}
                onMouseEnter={e => { e.currentTarget.style.borderBottomColor = '#c0392b'; }}
                onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
              >
                🏷️ {t("nav.sales")}
              </button>
              {menuData.map(item => (
                <div key={item.id} style={{ position: "relative" }}
                  onMouseEnter={() => handleEnter(item.id)}
                  onMouseLeave={handleLeave}
                >
                  <button onClick={() => handleSelect(item.cat)} onFocus={() => handleEnter(item.id)}
                    aria-expanded={activeId === item.id} aria-haspopup="true"
                    style={{ background: "none", border: "none", color: activeId === item.id ? "var(--ys-purple)" : "var(--ys-ink)", padding: "9px 13px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: activeId === item.id ? 700 : 500, borderBottom: activeId === item.id ? "2px solid var(--ys-purple)" : "2px solid transparent", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
                    {item.label}
                    <span aria-hidden="true" style={{ fontSize: 9, color: "var(--ys-on-dark)", display: "inline-block", transition: "transform 0.2s ease", transform: activeId === item.id ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </button>
                  {activeId === item.id && <MegaPanel item={item} onSelect={handleSelect} />}
                </div>
              ))}
              <div style={{ width: 1, height: 20, background: "#E7E2D8", margin: "0 4px" }} />
              {SIMPLE_NAV.map(nav => {
                // "מתנות לאירועים" הוא יעד מסחרי ולא קישור שירות — מודגש
                // בזהב המותג במקום באפור של שאר הפריטים בקבוצה.
                const promoted = nav.action === "gifts" || nav.action === "build";
                const base = promoted ? "#9C7B3F" : "#555";
                return (
                  <button key={nav.action} onClick={() => handleAction(nav.action)}
                    style={{ background: "none", border: "none", color: base, padding: "9px 11px", fontSize: promoted ? 13 : 12.5, fontWeight: promoted ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", borderBottom: "2px solid transparent", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = promoted ? "var(--ys-purple)" : "var(--ys-ink)"; if (promoted) e.currentTarget.style.borderBottomColor = "var(--ys-on-dark)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = base; e.currentTarget.style.borderBottomColor = "transparent"; }}
                  >
                    {nav.label}
                  </button>
                );
              })}
              <div style={{ marginRight: 'auto' }} />
              <button
                onClick={() => router.push('/soferim')}
                style={{ background: 'var(--ys-page)', color: 'var(--ys-plum)', border: '1px solid var(--ys-plum)', borderRadius: 'var(--ys-radius-pill)', padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}
              >
                {t("nav.meetScribes")}
              </button>
            </div>
          </div>
      </header>

      <MobileDrawerMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        menuData={menuData}
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
  // /admin/emails נטען כ-iframe בתוך האדמין — בלי מעטפת האתר
  if (pathname?.startsWith('/ops') || pathname?.startsWith('/bar-mitzvah') || pathname?.startsWith('/admin/emails')) return null;
  return <NavBarContent />;
}
