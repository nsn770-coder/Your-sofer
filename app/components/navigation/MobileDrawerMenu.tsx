"use client";
// components/navigation/MobileDrawerMenu.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { navigationData, NavItem } from "@/data/navigation";
import { X, ChevronLeft, Menu } from "lucide-react";

const drawerVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 35 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const accordionVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

interface AccordionItemProps {
  item: NavItem;
  onClose: () => void;
}

function AccordionItem({ item, onClose }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMenu = !!item.columns?.length;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-right text-gray-800 font-medium text-[15px] hover:bg-gray-50/80 transition-colors duration-150 focus-visible:bg-gray-50 outline-none"
        onClick={() => hasMenu && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="flex-1 text-right">{item.label}</span>
        {hasMenu && (
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex-shrink-0 mr-3 text-gray-400"
          >
            <ChevronLeft size={16} />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && hasMenu && (
          <motion.div
            variants={accordionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="pb-3 bg-gray-50/50">
              {item.columns?.map((col, colIdx) => (
                <div key={colIdx} className="pt-3">
                  <p className="px-8 pb-2 text-[10px] font-semibold tracking-widest text-gray-400 uppercase text-right">
                    {col.title}
                  </p>
                  <ul>
                    {col.items.map((sub, subIdx) => (
                      <li key={subIdx}>
                        <Link
                          href={sub.href}
                          onClick={onClose}
                          className="flex items-center justify-end gap-2 px-8 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-white transition-colors duration-150 active:bg-gray-100"
                        >
                          {sub.label}
                          <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Promo card in mobile */}
              {item.promo && (
                <div className="mx-6 mt-3 mb-2 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-100">
                  <p className="text-sm font-semibold text-gray-800 text-right mb-1">
                    {item.promo.title}
                  </p>
                  <p className="text-xs text-gray-500 text-right mb-3">
                    {item.promo.description}
                  </p>
                  <div className="flex justify-end">
                    <Link
                      href={item.promo.ctaHref}
                      onClick={onClose}
                      className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors"
                    >
                      {item.promo.ctaLabel} ←
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MobileDrawerMenuProps {
  logoSlot?: React.ReactNode;
}

export default function MobileDrawerMenu({ logoSlot }: MobileDrawerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 outline-none"
        aria-label="פתח תפריט"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 z-50 w-[88vw] max-w-[360px] bg-white flex flex-col"
              style={{
                boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="תפריט ניווט"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                {logoSlot ?? (
                  <span className="text-base font-bold text-gray-900 tracking-tight">
                    Your Sofer
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="סגור תפריט"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation items */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {navigationData.map((item) => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
                <Link
                  href="/contact"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-sm text-gray-500 hover:text-amber-700 transition-colors duration-150 mb-3"
                >
                  צור קשר
                </Link>
                <Link
                  href="/about"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-sm text-gray-500 hover:text-amber-700 transition-colors duration-150"
                >
                  אודות
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
