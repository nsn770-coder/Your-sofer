'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SHIRA_SYSTEM_PROMPT = `את שירה — סוכנת מכירות של YourSofer, חנות יודאיקה וסת"ם מקוונת.
את אישה חמה, רגשית, ואמפתית. את מרגישה את הלקוח ומגיבה לרגשותיו.
את מדברת בעברית תקנית, בגוף ראשון נשי, בצורה חמה ואישית.

על האתר:
- YourSofer (your-sofer.com) — מרקטפלייס לסת"ם ויודאיקה
- מוצרים: מזוזות, תפילין, טליתות, יודאיקה, כלי הגשה, עיצוב הבית, מתנות
- סופרים מוסמכים מאמתים כל מוצר
- משלוח חינם בישראל
- ניתן לשלם ב-3 תשלומים ללא ריבית

אופי:
- רגישה ואמפתית — מרגישה כשהלקוח מחפש מתנה לאהוב, מזוזה לבית חדש, או מתנה לשמחה
- שואלת שאלות כדי להבין את הצורך האמיתי
- ממליצה בחום, לא מוכרת בכוח
- כשהלקוח מהסס — מעודדת ומחזקת
- משתמשת לפעמים במילים חמות כמו "נשמה", "יקירי/יקירתי"
- מסיימת לפעמים עם אמוג'י חם 💛

כללים:
- תמיד בעברית
- תשובות קצרות וממוקדות (2-4 משפטים)
- אם שואלים על מחיר ספציפי — הפני לדף המוצר
- אם הלקוח רוצה לדבר עם אדם — הפני לוואטסאפ: 050-XXXXXXX
- אל תמציאי פרטים שאינך יודעת`;

export default function ShiraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([{
            role: 'assistant',
            content: 'שלום! אני שירה 💛 אשמח לעזור לך למצוא בדיוק מה שאתה מחפש. ספר לי — מה מביא אותך היום?'
          }]);
        }, 1500);
      }, 400);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/shira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        })
      });

      const data = await response.json();
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'סליחה, נתקלתי בבעיה טכנית קטנה. נסה שוב בעוד רגע 💛'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* כפתור צף */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="shira-toggle"
        aria-label="פתח צ'אט עם שירה"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <div className="shira-avatar-btn">
            <span>ש</span>
            <div className="shira-online-dot" />
          </div>
        )}
      </button>

      {/* חלון הצ'אט */}
      {isOpen && (
        <div className="shira-window" dir="rtl">
          {/* כותרת */}
          <div className="shira-header">
            <div className="shira-header-avatar">ש</div>
            <div className="shira-header-info">
              <div className="shira-header-name">שירה</div>
              <div className="shira-header-status">
                <span className="shira-status-dot" />
                זמינה עכשיו
              </div>
            </div>
          </div>

          {/* הודעות */}
          <div className="shira-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`shira-msg shira-msg-${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="shira-msg-avatar">ש</div>
                )}
                <div className="shira-msg-bubble">{msg.content}</div>
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

          {/* שדה קלט */}
          <div className="shira-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתוב הודעה..."
              className="shira-input"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              className="shira-send"
              disabled={!input.trim() || isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .shira-toggle {
          position: fixed;
          bottom: 24px;
          left: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          border: none;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 4px 20px rgba(184,134,11,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .shira-toggle:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(184,134,11,0.5);
        }
        .shira-avatar-btn {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          font-family: 'David', serif;
        }
        .shira-online-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 12px;
          height: 12px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid white;
        }
        .shira-window {
          position: fixed;
          bottom: 96px;
          left: 24px;
          width: 340px;
          height: 480px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.18);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: shiraSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes shiraSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .shira-header {
          background: linear-gradient(135deg, #b8860b, #d4a017);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .shira-header-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
          font-family: 'David', serif;
          flex-shrink: 0;
        }
        .shira-header-name {
          color: white;
          font-weight: 700;
          font-size: 17px;
        }
        .shira-header-status {
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }
        .shira-status-dot {
          width: 7px;
          height: 7px;
          background: #86efac;
          border-radius: 50%;
        }
        .shira-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f9f7f4;
        }
        .shira-messages::-webkit-scrollbar { width: 4px; }
        .shira-messages::-webkit-scrollbar-thumb { background: #e5d9c3; border-radius: 4px; }
        .shira-msg {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .shira-msg-user {
          flex-direction: row-reverse;
        }
        .shira-msg-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          font-family: 'David', serif;
        }
        .shira-msg-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .shira-msg-assistant .shira-msg-bubble {
          background: white;
          color: #1a1a1a;
          border-bottom-right-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .shira-msg-user .shira-msg-bubble {
          background: linear-gradient(135deg, #b8860b, #d4a017);
          color: white;
          border-bottom-left-radius: 4px;
        }
        .shira-typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 12px 16px;
        }
        .shira-typing span {
          width: 7px;
          height: 7px;
          background: #b8860b;
          border-radius: 50%;
          animation: shiraBounce 1.2s infinite;
        }
        .shira-typing span:nth-child(2) { animation-delay: 0.2s; }
        .shira-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes shiraBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .shira-input-area {
          padding: 12px 16px;
          background: white;
          border-top: 1px solid #f0ebe3;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .shira-input {
          flex: 1;
          border: 1.5px solid #e8e0d4;
          border-radius: 24px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          direction: rtl;
          background: #faf9f7;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .shira-input:focus {
          border-color: #b8860b;
          background: white;
        }
        .shira-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #b8860b, #d4a017);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          transition: opacity 0.2s, transform 0.2s;
        }
        .shira-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .shira-send:not(:disabled):hover {
          transform: scale(1.08);
        }
        @media (max-width: 480px) {
          .shira-window {
            left: 12px;
            right: 12px;
            width: auto;
            bottom: 88px;
          }
          .shira-toggle {
            left: 16px;
            bottom: 16px;
          }
        }
      `}</style>
    </>
  );
}
