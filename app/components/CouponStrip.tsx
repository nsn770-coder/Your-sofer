'use client';

import { useState } from 'react';

const COUPON_CODE = 'TAMUZ10';

export default function CouponStrip() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard unavailable — silent fail
    }
  }

  return (
    <>
      <div
        dir="rtl"
        style={{
          width: '100%',
          background: '#111111',
          borderBottom: '1px solid rgba(197,160,40,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '8px 16px',
          flexWrap: 'wrap',
        }}
      >
        <span className="coupon-label">
          🎁 קוד קופון להנחה של 10%:
        </span>
        <span className="coupon-code">
          {COUPON_CODE}
        </span>
        <button
          onClick={handleCopy}
          className={`coupon-btn${copied ? ' coupon-btn--copied' : ''}`}
          aria-label="העתק קוד קופון"
        >
          {copied ? '✓ הועתק!' : 'העתק'}
        </button>
      </div>

      <style jsx>{`
        .coupon-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          font-family: var(--font-heebo), Arial, sans-serif;
        }
        .coupon-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 700;
          font-size: 14px;
          color: #C5A028;
          letter-spacing: 1.2px;
          white-space: nowrap;
        }
        .coupon-btn {
          background: none;
          border: 1px solid rgba(197, 160, 40, 0.45);
          border-radius: 0;
          color: rgba(255, 255, 255, 0.65);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 9px;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
          font-family: var(--font-heebo), Arial, sans-serif;
          line-height: 1.6;
        }
        .coupon-btn:hover {
          color: #C5A028;
          border-color: rgba(197, 160, 40, 0.8);
        }
        .coupon-btn--copied {
          color: #C5A028;
          border-color: rgba(197, 160, 40, 0.8);
        }
        @media (max-width: 640px) {
          .coupon-label { font-size: 12px; }
          .coupon-code  { font-size: 13px; letter-spacing: 0.8px; }
        }
      `}</style>
    </>
  );
}
