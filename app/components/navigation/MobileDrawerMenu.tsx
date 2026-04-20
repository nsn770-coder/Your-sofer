"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

export interface NavSubItem { label: string; cat: string; filter?: string; }
export interface NavColumn { title: string; items: NavSubItem[]; }
export interface NavMenuItem { id: string; label: string; cat: string; columns: NavColumn[]; }
export interface SimpleNavItem { label: string; action: string; }

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuData: NavMenuItem[];
  simpleNav: SimpleNavItem[];
  onSelect: (cat: string, filter?: string) => void;
  onAction: (action: string) => void;
  user: { displayName?: string | null; photoURL?: string | null; role?: string } | null;
  signInWithGoogle: () => void;
  logout: () => void;
}

const drawerVariants: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { type: "spring", stiffness: 300, damping: 35 } },
  exit: { x: "100%", transition: { duration: 0.2, ease: "easeIn" } },
};

const accordionVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: "auto", opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } },
};

function MobileAccordion({ item, onSelect }: { item: NavMenuItem; onSelect: (cat: string, filter?: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0" dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-5 text-right text-gray-900 font-semibold text-[17px] hover:bg-gray-50 transition-colors duration-150 outline-none"
      >
        <span className="flex-1 text-right">{item.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-shrink-0 ml-2 text-gray-400"
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div variants={accordionVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden">
            <div className="pb-4 bg-gray-50">
              {item.columns.map((col, ci) => (
                <div key={ci} className="pt-3">
                  <p className="px-6 pb-2 pt-1 text-[11px] font-bold tracking-widest text-gray-400 uppercase text-right">
                    {col.title}
                  </p>
                  <ul>
                    {col.items.map((sub, si) => (
                      <li key={si}>
                        <button
                          onClick={() => onSelect(sub.cat, sub.filter)}
                          className="flex items-center justify-end gap-3 w-full px-6 py-3 text-[16px] text-gray-700 hover:text-gray-900 hover:bg-white transition-colors duration-150 active:bg-gray-100 text-right"
                          style={{ fontFamily: "inherit" }}
                        >
                          {sub.label}
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="px-5 pt-2 flex justify-end">
                <button
                  onClick={() => onSelect(item.cat)}
                  className="text-[12px] text-amber-700 border border-amber-200 rounded-full px-3.5 py-1.5 hover:bg-amber-50 transition-colors"
                  style={{ fontFamily: "inherit" }}
                >
                  לכל {item.label} ←
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MobileDrawerMenu({
  isOpen,
  onClose,
  menuData,
  simpleNav,
  onSelect,
  onAction,
  user,
  signInWithGoogle,
  logout,
}: MobileDrawerMenuProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={drawerVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed top-0 right-0 bottom-0 z-[310] w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200">
              <span className="text-[18px] font-bold text-gray-900">תפריט</span>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="סגור תפריט"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {menuData.map(item => (
                <MobileAccordion key={item.id} item={item} onSelect={onSelect} />
              ))}
              <div className="border-t border-gray-200 mt-2">
                {simpleNav.map(nav => (
                  <button
                    key={nav.action}
                    onClick={() => onAction(nav.action)}
                    className="block w-full px-5 py-4 text-right text-[17px] text-gray-700 hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: "inherit" }}
                  >
                    {nav.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-5 bg-gray-50">
              {user ? (
                <div className="flex items-center justify-between">
                  <button
                    onClick={logout}
                    className="border border-gray-300 text-gray-600 rounded-lg px-4 py-2 text-[13px] hover:bg-gray-100 transition-colors"
                    style={{ fontFamily: "inherit" }}
                  >
                    יציאה
                  </button>
                  <span className="text-[14px] text-gray-900 font-medium">
                    שלום, {user.displayName?.split(" ")[0]}
                  </span>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="w-full bg-white border border-gray-300 text-gray-800 rounded-xl py-3 text-[15px] font-semibold hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: "inherit" }}
                >
                  התחבר עם Google
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
