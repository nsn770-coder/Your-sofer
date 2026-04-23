'use client';

import { useState, useRef, useEffect } from 'react';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchFilters {
  cat?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  keywords?: string[];
  sort?: string;
}

interface ProductResult {
  id: string;
  name: string;
  price: number;
  imgUrl: string;
  cat: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ProductResult[];
  isFallback?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSearchAction(text: string): { action: string; filters: SearchFilters } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.action === 'search' && parsed.filters) return parsed;
  } catch {
    // not JSON — normal text
  }
  return null;
}

function mergeFilters(current: SearchFilters, next: SearchFilters): SearchFilters {
  const merged: SearchFilters = { ...current };
  for (const [key, value] of Object.entries(next)) {
    const k = key as keyof SearchFilters;
    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete merged[k];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[k] = value;
    }
  }
  return merged;
}

// ── Product card (inline in chat) ─────────────────────────────────────────────

function ProductCard({ product }: { product: ProductResult }) {
  return (
    <a
      href={`/product/${product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shira-product-card"
    >
      <div className="shira-product-img">
        {product.imgUrl ? (
          <img
            src={optimizeCloudinaryUrl(product.imgUrl, 80)}
            alt={product.name}
            width={60}
            height={60}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: 24 }}>📦</span>
        )}
      </div>
      <div className="shira-product-info">
        <div className="shira-product-name">{product.name}</div>
        {product.cat && <div className="shira-product-cat">{product.cat}</div>}
      </div>
      <div className="shira-product-price-col">
        <div className="shira-product-price">₪{Math.round(product.price).toLocaleString('he-IL')}</div>
        <div className="shira-product-cta">לצפייה ←</div>
      </div>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShiraChat() {
  const [isOpen, setIsOpen]               = useState(false);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [input, setInput]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [isTyping, setIsTyping]           = useState(false);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([{
            role: 'assistant',
            content: 'שלום! אני שירה 💛 אשמח לעזור לך למצוא בדיוק מה שאתה מחפש. ספר לי — מה מביא אותך היום?',
          }]);
        }, 1200);
      }, 400);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // 1 — Ask Shira (may return text or JSON search action)
      const chatRes = await fetch('/api/shira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          currentFilters: Object.keys(currentFilters).length > 0 ? currentFilters : undefined,
        }),
      });
      const chatData = await chatRes.json();
      const rawMessage: string = chatData.message ?? '';

      setIsTyping(false);

      // 2 — Check if it's a search action
      const action = parseSearchAction(rawMessage);

      if (action) {
        const mergedFilters = mergeFilters(currentFilters, action.filters);
        setCurrentFilters(mergedFilters);

        // 3 — Execute search on server
        const searchRes = await fetch('/api/shira/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: mergedFilters }),
        });
        const { products, fallback }: { products: ProductResult[]; fallback: boolean } =
          await searchRes.json();

        const intro =
          products.length === 0
            ? 'לא מצאתי מוצרים מתאימים עכשיו. נסי/נסה לתאר אחרת ואחפש שוב 💛'
            : fallback
            ? 'לא מצאתי בדיוק, אבל אלה הכי קרובות לבקשה שלך 💛'
            : `מצאתי ${products.length} מוצרים בשבילך! 💛`;

        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: intro, products: products.length > 0 ? products : undefined, isFallback: fallback },
        ]);
      } else {
        // Regular text response
        setMessages(prev => [...prev, { role: 'assistant', content: rawMessage }]);
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'סליחה, נתקלתי בבעיה טכנית קטנה. נסה שוב בעוד רגע 💛' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* ── Toggle button ── */}
      <button onClick={() => setIsOpen(o => !o)} className="shira-toggle" aria-label="פתח צ'אט עם שירה">
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <div className="shira-avatar-btn">
            <span>ש</span>
            <div className="shira-online-dot" />
          </div>
        )}
      </button>

      {/* ── Chat window ── */}
      {isOpen && (
        <div className="shira-window" dir="rtl">

          {/* Header */}
          <div className="shira-header">
            <div className="shira-header-avatar">ש</div>
            <div className="shira-header-info">
              <div className="shira-header-name">שירה — יועצת מוצרים</div>
              <div className="shira-header-status">
                <span className="shira-status-dot" />זמינה עכשיו
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="shira-messages">
            {messages.map((msg, i) => (
              <div key={i}>
                {/* Text bubble */}
                {msg.content && (
                  <div className={`shira-msg shira-msg-${msg.role}`}>
                    {msg.role === 'assistant' && <div className="shira-msg-avatar">ש</div>}
                    <div className="shira-msg-bubble">{msg.content}</div>
                  </div>
                )}

                {/* Product cards */}
                {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                  <div className="shira-products">
                    {msg.products.map(p => <ProductCard key={p.id} product={p} />)}
                    {msg.isFallback && (
                      <div className="shira-fallback-note">* תוצאות קרובות — לא בדיוק מה שביקשת</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="shira-msg shira-msg-assistant">
                <div className="shira-msg-avatar">ש</div>
                <div className="shira-msg-bubble shira-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shira-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="תאר מה אתה מחפש..."
              className="shira-input"
              disabled={isLoading}
            />
            <button onClick={sendMessage} className="shira-send" disabled={!input.trim() || isLoading}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style jsx global>{`
        /* Toggle */
        .shira-toggle {
          position: fixed; bottom: 24px; left: 24px;
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          border: none; cursor: pointer; z-index: 9999;
          box-shadow: 0 4px 20px rgba(184,134,11,0.4);
          display: flex; align-items: center; justify-content: center;
          color: white; transition: transform 0.2s, box-shadow 0.2s;
        }
        .shira-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(184,134,11,0.5); }
        .shira-avatar-btn {
          position: relative; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; font-family: 'David', serif;
        }
        .shira-online-dot {
          position: absolute; top: 10px; right: 10px;
          width: 12px; height: 12px;
          background: #22c55e; border-radius: 50%; border: 2px solid white;
        }

        /* Window */
        .shira-window {
          position: fixed; bottom: 96px; left: 24px;
          width: 340px; max-height: 560px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.18);
          z-index: 9998; display: flex; flex-direction: column; overflow: hidden;
          animation: shiraSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes shiraSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .shira-header {
          background: linear-gradient(135deg, #b8860b, #d4a017);
          padding: 14px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .shira-header-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 19px; font-weight: 700; color: white; flex-shrink: 0;
          font-family: 'David', serif;
        }
        .shira-header-name { color: white; font-weight: 700; font-size: 15px; }
        .shira-header-status {
          color: rgba(255,255,255,0.85); font-size: 11px;
          display: flex; align-items: center; gap: 5px; margin-top: 2px;
        }
        .shira-status-dot { width: 7px; height: 7px; background: #86efac; border-radius: 50%; }

        /* Messages area */
        .shira-messages {
          flex: 1; overflow-y: auto; padding: 14px 12px;
          display: flex; flex-direction: column; gap: 10px; background: #f9f7f4;
        }
        .shira-messages::-webkit-scrollbar { width: 4px; }
        .shira-messages::-webkit-scrollbar-thumb { background: #e5d9c3; border-radius: 4px; }

        /* Message rows */
        .shira-msg { display: flex; align-items: flex-end; gap: 8px; }
        .shira-msg-user { flex-direction: row-reverse; }
        .shira-msg-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
          font-family: 'David', serif;
        }
        .shira-msg-bubble {
          max-width: 78%; padding: 9px 13px; border-radius: 17px;
          font-size: 13.5px; line-height: 1.55; white-space: pre-wrap;
        }
        .shira-msg-assistant .shira-msg-bubble {
          background: white; color: #1a1a1a; border-bottom-right-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .shira-msg-user .shira-msg-bubble {
          background: linear-gradient(135deg, #b8860b, #d4a017);
          color: white; border-bottom-left-radius: 4px;
        }

        /* Typing dots */
        .shira-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; }
        .shira-typing span {
          width: 7px; height: 7px; background: #b8860b; border-radius: 50%;
          animation: shiraBounce 1.2s infinite;
        }
        .shira-typing span:nth-child(2) { animation-delay: 0.2s; }
        .shira-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes shiraBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* Product cards */
        .shira-products {
          margin: 4px 0 0 36px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .shira-product-card {
          display: flex; align-items: center; gap: 10px;
          background: white; border-radius: 12px;
          border: 1px solid #ede8df;
          padding: 8px 10px; text-decoration: none;
          transition: box-shadow 0.18s, border-color 0.18s;
          cursor: pointer;
        }
        .shira-product-card:hover {
          box-shadow: 0 3px 12px rgba(184,134,11,0.18);
          border-color: #d4a017;
        }
        .shira-product-img {
          width: 56px; height: 56px; border-radius: 8px;
          overflow: hidden; flex-shrink: 0; background: #f5f3ef;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #ede8df;
        }
        .shira-product-info {
          flex: 1; min-width: 0;
        }
        .shira-product-name {
          font-size: 12px; font-weight: 700; color: #1a1a1a;
          line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .shira-product-cat {
          font-size: 10px; color: #b8860b; font-weight: 600; margin-top: 2px;
        }
        .shira-product-price-col {
          flex-shrink: 0; text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
        }
        .shira-product-price {
          font-size: 14px; font-weight: 900; color: #0c1a35; white-space: nowrap;
        }
        .shira-product-cta {
          font-size: 10px; font-weight: 700;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          color: white; padding: 3px 8px; border-radius: 20px; white-space: nowrap;
        }
        .shira-fallback-note {
          font-size: 10px; color: #aaa; text-align: center; padding: 2px 0;
        }

        /* Input */
        .shira-input-area {
          padding: 10px 14px; background: white;
          border-top: 1px solid #f0ebe3; display: flex; gap: 8px; align-items: center; flex-shrink: 0;
        }
        .shira-input {
          flex: 1; border: 1.5px solid #e8e0d4; border-radius: 22px;
          padding: 9px 14px; font-size: 13.5px; outline: none;
          direction: rtl; background: #faf9f7;
          transition: border-color 0.2s; font-family: inherit;
        }
        .shira-input:focus { border-color: #b8860b; background: white; }
        .shira-send {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0; transition: opacity 0.2s, transform 0.2s;
        }
        .shira-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .shira-send:not(:disabled):hover { transform: scale(1.08); }

        /* Mobile */
        @media (max-width: 480px) {
          .shira-window { left: 10px; right: 10px; width: auto; bottom: 86px; max-height: 75vh; }
          .shira-toggle { left: 14px; bottom: 14px; width: 54px; height: 54px; }
          .shira-products { margin-left: 0; }
        }
      `}</style>
    </>
  );
}
