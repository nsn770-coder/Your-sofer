'use client';

import { useEffect, useState } from 'react';
import { ADMIN_NAVIGATION, type AdminBadgeCounts, type AdminNavItem } from './adminNavigation';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  badges: AdminBadgeCounts;
  onAddProduct: () => void;
}

/**
 * Grouped admin sidebar, mirroring the partner dashboard layout.
 *
 * Purely a navigation shell: selecting an item calls `onSelectTab`, which is the
 * dashboard's existing `setActiveTab`. Link items navigate to separate admin
 * pages exactly as the old buttons did.
 */
export function AdminSidebar({ activeTab, onSelectTab, badges, onAddProduct }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const width = collapsed ? 68 : 236;

  function renderItem(item: AdminNavItem) {
    const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
    const isActive = !!item.tab && item.tab === activeTab;

    const inner = (
      <>
        <span className="w-6 flex-shrink-0 text-center text-base leading-none">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-sm truncate">{item.label}</span>
            {badge > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </>
        )}
        {collapsed && badge > 0 && (
          <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </>
    );

    const className = `relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-right transition-colors ${
      isActive
        ? 'bg-amber-50 text-amber-800 font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

    if (item.href) {
      return (
        <a
          key={item.href}
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={className}
          style={{ textDecoration: 'none' }}
        >
          {inner}
        </a>
      );
    }

    return (
      <button
        key={item.tab}
        type="button"
        title={collapsed ? item.label : undefined}
        onClick={() => {
          onSelectTab(item.tab!);
          setDrawerOpen(false);
        }}
        className={className}
      >
        {inner}
      </button>
    );
  }

  const nav = (
    <nav className="p-3 space-y-4">
      <button
        type="button"
        onClick={() => {
          onAddProduct();
          setDrawerOpen(false);
        }}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold text-white"
        style={{ background: 'var(--ys-accent)' }}
        title="הוסף מוצר חדש"
      >
        <span>➕</span>
        {!collapsed && <span>הוסף מוצר</span>}
      </button>

      {ADMIN_NAVIGATION.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold text-gray-400 tracking-wide">
              {group.title}
            </div>
          )}
          {collapsed && <div className="mx-2 mb-2 border-t border-gray-200" />}
          <div className="space-y-0.5">{group.items.map(renderItem)}</div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow font-bold text-gray-700"
      >
        ☰ תפריט ניהול
      </button>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block flex-shrink-0 self-start sticky top-4 bg-white rounded-xl shadow overflow-y-auto transition-all duration-200"
        style={{ width, maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="flex items-center justify-between px-3 h-12 border-b border-gray-100">
          {!collapsed && <span className="font-bold text-gray-800 text-sm">ניהול</span>}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            title={collapsed ? 'הרחבת התפריט' : 'כיווץ התפריט'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer — opens from the right for RTL */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[600]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute top-0 bottom-0 right-0 w-[280px] max-w-[85vw] bg-white shadow-xl overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 sticky top-0 bg-white">
              <span className="font-bold text-gray-800 text-sm">ניהול</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 text-lg leading-none"
                aria-label="סגירת התפריט"
              >
                ✕
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
