"use client";
// components/navigation/DesktopMegaMenu.tsx

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { navigationData, NavItem } from "@/data/navigation";
import { ChevronDown } from "lucide-react";

const HOVER_DELAY = 80;
const LEAVE_DELAY = 120;

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.22, ease: "easeOut", staggerChildren: 0.04, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } },
};

const columnVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 4 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: "easeOut" } },
};

interface MegaMenuPanelProps {
  item: NavItem;
}

function MegaMenuPanel({ item }: MegaMenuPanelProps) {
  const hasPromo = !!item.promo;
  const columnCount = item.columns?.length ?? 0;

  return (
    <motion.div
      variants={menuVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute top-full right-1/2 translate-x-1/2 mt-2 z-50"
      style={{ minWidth: "680px", maxWidth: "1100px" }}
      role="dialog"
      aria-label={`תפריט ${item.label}`}
    >
      <div
        className="absolute -top-[6px] right-1/2 translate-x-1/2 w-3 h-3 rotate-45 bg-white border-t border-r border-gray-100"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      />
      <div
        className="relative bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04), 0 20px 60px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)" }}
      >
        <div className={`flex flex-row-reverse ${hasPromo ? "divide-x divide-x-reverse divide-gray-50" : ""}`}>
          <div className={`flex flex-row-reverse gap-0 flex-1 p-7 ${columnCount === 1 ? "justify-end" : ""}`}>
            {item.columns?.map((col, colIdx) => (
              <motion.div key={colIdx} variants={columnVariants} className="flex-1 min-w-[160px] px-5 first:pr-0 last:pl-0">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-4 text-right pb-2 border-b border-gray-50">
                  {col.title}
                </p>
                <ul className="space-y-1" role="list">
                  {col.items.map((sub, subIdx) => (
                    <motion.li key={subIdx} variants={itemVariants}>
                      <Link href={sub.href} className="group flex items-center justify-end gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-150 text-right">
                        <span className="group-hover:translate-x-[-2px] transition-transform duration-150">{sub.label}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-200 group-hover:bg-amber-400 flex-shrink-0 transition-colors duration-150" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {hasPromo && item.promo && (
            <motion.div variants={columnVariants} className="w-[220px] flex-shrink-0 p-5 bg-gradient-to-br from-stone-50 to-amber-50/40">
              <Link href={item.promo.ctaHref} className="group block h-full" tabIndex={0}>
                <div className="w-full h-[110px] rounded-xl bg-gradient-to-br from-amber-100 to-stone-200 mb-4 overflow-hidden relative">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.promo.image})`, backgroundSize: "cover" }} />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-200/50 to-transparent" />
                </div>
                <p className="text-sm font-semibold text-gray-800 text-right mb-1 group-hover:text-amber-700 transition-colors duration-200">{item.promo.title}</p>
                <p className="text-xs text-gray-500 text-right leading-relaxed mb-4">{item.promo.description}</p>
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-full group-hover:bg-amber-100 group-hover:border-amber-300 transition-all duration-200">
                    {item.promo.ctaLabel}
                    <span className="text-[10px]">←</span>
                  </span>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        <div className="px-7 py-3 bg-gray-50/60 border-t border-gray-100 flex justify-end">
          <Link href={item.href ?? "#"} className="text-xs text-gray-400 hover:text-amber-700 transition-colors duration-150 flex items-center gap-1">
            לכל {item.label}
            <span className="text-[10px]">←</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function DesktopMegaMenu() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleMouseEnter = useCallback((id: string) => {
    clearTimers();
    openTimer.current = setTimeout(() => setActiveId(id), HOVER_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setActiveId(null), LEAVE_DELAY);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveId(activeId === id ? null : id); }
    if (e.key === "Escape") setActiveId(null);
  }, [activeId]);

  return (
    <nav className="hidden lg:flex items-center gap-1 relative" dir="rtl" role="navigation" aria-label="ניווט ראשי">
      {navigationData.map((item) => {
        const isActive = activeId === item.id;
        const hasMenu = !!item.columns?.length;
        return (
          <div key={item.id} className="relative"
            onMouseEnter={() => hasMenu && handleMouseEnter(item.id)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 ${isActive ? "text-gray-900 bg-gray-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/80"}`}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              aria-expanded={isActive}
              aria-haspopup={hasMenu ? "true" : undefined}
              onClick={() => hasMenu && setActiveId(isActive ? null : item.id)}
            >
              {item.label}
              {hasMenu && (
                <ChevronDown size={13} className={`transition-transform duration-300 text-gray-400 ${isActive ? "rotate-180 text-amber-500" : ""}`} />
              )}
              <motion.span
                className="absolute bottom-1 right-4 left-4 h-[2px] bg-amber-400 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isActive ? 1 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ originX: "50%" }}
              />
            </button>
            <AnimatePresence>
              {isActive && hasMenu && <MegaMenuPanel item={item} />}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
