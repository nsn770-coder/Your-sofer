"use client";

// app/components/EmbroideryThreadColorPicker.tsx
//
// בורר צבע חוט לרקמה — כפתור שפותח Bottom Sheet במובייל / Modal בדסקטופ.
// מציג תמונות אמיתיות של גלילי החוט מתוך תמונת הקטלוג (CSS sprite,
// public/embroidery-threads.jpg). אם התמונה חסרה — נופל חזרה לעיגולי צבע.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  THREAD_COLORS,
  BRAND_COLOR,
  THREAD_SPRITE_CANDIDATES,
  SPRITE_ZOOM,
  type ThreadColor,
} from "../data/threadColors";

export interface EmbroideryThreadColorPickerProps {
  value?: ThreadColor | null;
  onChange: (color: ThreadColor) => void;
  required?: boolean;
  error?: string;
}

interface SpriteInfo {
  src: string;
  /** גובה/רוחב של תמונת הקטלוג */
  aspect: number;
}

// מחשב האם צבע בהיר (כדי לבחור צבע ✓ מנוגד + מסגרת דקה לצבעים בהירים).
function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 180;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// סגנון אריח המציג את אזור הגליל הרלוונטי מתוך תמונת הקטלוג.
function spriteTileStyle(color: ThreadColor, sprite: SpriteInfo): CSSProperties {
  const z = SPRITE_ZOOM;
  const vTiles = z * sprite.aspect; // כמה "אריחים" נכנסים בגובה התמונה
  const px = clamp01((color.cx * z - 0.5) / (z - 1)) * 100;
  const py = clamp01((color.cy * vTiles - 0.5) / (vTiles - 1)) * 100;
  return {
    backgroundImage: `url("${sprite.src}")`,
    backgroundSize: `${z * 100}% auto`,
    backgroundPosition: `${px}% ${py}%`,
    backgroundRepeat: "no-repeat",
    backgroundColor: "#F3F4F6",
  };
}

export default function EmbroideryThreadColorPicker({
  value,
  onChange,
  required = false,
  error,
}: EmbroideryThreadColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sprite, setSprite] = useState<SpriteInfo | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // טוען את תמונת הקטלוג פעם אחת; אם אף מועמד לא נטען — נשארים עם עיגולי hex.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of THREAD_SPRITE_CANDIDATES) {
        const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve(null);
          img.src = src;
        });
        if (cancelled) return;
        if (dims && dims.w > 0) {
          setSprite({ src, aspect: dims.h / dims.w });
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return THREAD_COLORS;
    return THREAD_COLORS.filter(
      (c) => c.id.includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [query]);

  function handleSelect(color: ThreadColor) {
    onChange(color);
    setOpen(false);
    setQuery("");
  }

  return (
    <div dir="rtl" className="w-full" style={{ fontFamily: "Heebo, Arial, sans-serif" }}>
      {/* כפתור פתיחה */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-white font-medium shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded-full border border-white/70"
          style={{
            backgroundColor: value?.hex ?? "transparent",
            backgroundImage: value
              ? undefined
              : "conic-gradient(#FFD600,#E60012,#0057D8,#0B5A32,#FFD600)",
          }}
        />
        בחר צבע חוט לרקמה
      </button>

      {/* כרטיס צבע נבחר */}
      {value && (
        <div className="mt-3 inline-flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
          {sprite ? (
            <span
              aria-hidden="true"
              className="inline-block h-9 w-9 rounded-lg border border-gray-200"
              style={spriteTileStyle(value, sprite)}
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-block h-7 w-7 rounded-full border"
              style={{
                backgroundColor: value.hex,
                borderColor: isLight(value.hex) ? "#D1D5DB" : value.hex,
              }}
            />
          )}
          <span className="text-sm text-gray-800">
            <span className="text-gray-500">צבע חוט נבחר: </span>
            <span className="font-semibold">
              {value.id} - {value.name}
            </span>
          </span>
        </div>
      )}

      {/* הודעת שגיאה עדינה */}
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {/* Overlay + חלון */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="בחר צבע חוט לרקמה"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet במובייל, Modal בדסקטופ */}
          <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-5 pt-4 pb-3">
              <h2 className="text-lg font-bold text-gray-900">בחר צבע חוט לרקמה</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגור חלון"
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-5 pt-3">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש לפי מספר צבע, לדוגמה 17"
                aria-label="חפש צבע חוט לפי מספר או שם"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2"
                style={{ "--tw-ring-color": BRAND_COLOR } as CSSProperties}
              />
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">לא נמצא צבע תואם</p>
              ) : (
                <div
                  className={
                    sprite
                      ? "grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-6"
                      : "grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 lg:grid-cols-8"
                  }
                >
                  {filtered.map((color) => {
                    const selected = value?.id === color.id;
                    const light = isLight(color.hex);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleSelect(color)}
                        aria-label={`בחר צבע חוט מספר ${color.id} ${color.name}`}
                        aria-pressed={selected}
                        className="group flex flex-col items-center gap-1.5 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      >
                        {sprite ? (
                          /* אריח תמונה אמיתית של הגליל מתוך הקטלוג */
                          <span
                            className="relative block aspect-square w-full max-w-[84px] overflow-hidden rounded-xl border transition-transform sm:group-hover:scale-105"
                            style={{
                              ...spriteTileStyle(color, sprite),
                              borderColor: selected ? BRAND_COLOR : "#E5E7EB",
                              boxShadow: selected ? `0 0 0 2px ${BRAND_COLOR}` : "none",
                            }}
                          >
                            {selected && (
                              <span
                                className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: BRAND_COLOR }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path
                                    d="M5 13l4 4L19 7"
                                    stroke="#FFFFFF"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            )}
                          </span>
                        ) : (
                          /* fallback — עיגול צבע כמו קודם */
                          <span
                            className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full transition-transform sm:h-11 sm:w-11 sm:group-hover:scale-110"
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: selected
                                ? `0 0 0 3px ${BRAND_COLOR}`
                                : light
                                ? "inset 0 0 0 1px #D1D5DB"
                                : "none",
                            }}
                          >
                            {selected && (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                  d="M5 13l4 4L19 7"
                                  stroke={light ? "#111827" : "#FFFFFF"}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                        )}
                        <span
                          className="text-xs font-semibold leading-none"
                          style={{ color: selected ? BRAND_COLOR : "#374151" }}
                        >
                          {color.id}
                        </span>
                        <span className="text-[11px] leading-tight text-gray-500">
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-2 sm:h-0" />
          </div>
        </div>
      )}
    </div>
  );
}
