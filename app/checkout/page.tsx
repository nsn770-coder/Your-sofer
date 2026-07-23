'use client';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, CartItem, SHIPPING_REGULAR, FREE_SHIPPING_THRESHOLD } from '../contexts/CartContext';
import type { SimchaResult } from '../lib/promoRules';
import { useShaliach } from '../contexts/ShaliachContext';
import { serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';
import * as pixel from '@/lib/metaPixel';
import SumitPaymentForm from '../components/SumitPaymentForm';
import DeliveryEstimate from '../components/DeliveryEstimate';
import PaymentMethodsRow from '../components/trust/PaymentMethodsRow';
import TrustCluster from '../components/trust/TrustCluster';
import SecurePaymentNotice from '../components/trust/SecurePaymentNotice';
import PageFaqSection from '../components/faq/PageFaqSection';

function IconLock({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconTruck({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function IconCheck({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconCart({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
}
function IconCreditCard({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IconTag({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function IconX({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconHandshake({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>;
}

function Input({ label, name, value, onChange, onBlur: onBlurProp, placeholder, type = 'text', required = false, autoComplete, inputMode }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={`checkout-${name}`} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#c0392b' }} aria-hidden="true">*</span>}
      </label>
      <input
        id={`checkout-${name}`}
        name={name} value={value} onChange={onChange} placeholder={placeholder} type={type}
        autoComplete={autoComplete} inputMode={inputMode} required={required}
        onFocus={() => setFocused(true)} onBlur={(e) => { setFocused(false); onBlurProp?.(e); }}
        style={{ width: '100%', border: `1.5px solid ${focused ? '#C5A028' : '#e0e0e0'}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s', background: '#fafafa' }}
      />
    </div>
  );
}

interface SiteSettings {
  checkoutEnabled: boolean;
  checkoutDisabledMessage: string;
}

interface OrderSummaryProps {
  isSticky: boolean;
  /** false — ללא מסגרת (כשהרכיב מקונן בתוך MobileOrderSummary) */
  framed?: boolean;
  items: CartItem[];
  total: number;
  bundleDiscountAmount: number;
  appliedCoupon: { code: string; discount: number; type: 'percent' | 'fixed' | 'simcha' } | null;
  setAppliedCoupon: (c: { code: string; discount: number; type: 'percent' | 'fixed' | 'simcha' } | null) => void;
  discountAmount: number;
  simchaResult: SimchaResult | null;
  finalTotal: number;
  selectedGift: string | null;
  giftOptions: { id: string; name: string; imgUrl?: string }[];
  giftEnabled: boolean;
  giftEligible: boolean;
  giftThreshold: number;
  amountToGift: number;
  setSelectedGift: (id: string) => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  couponLoading: boolean;
  couponError: string;
  shaliach: { name: string; chabadName?: string; city?: string } | null;
  pointsAvailable: number;
  pointsToUse: number;
  setPointsToUse: (n: number) => void;
  maxRedeemablePoints: number;
  shippingCost: number;
  /** משלוח חינם בגלל סף ההזמנה (להבדיל מאיסוף עצמי) */
  freeShipping: boolean;
}

function OrderSummary({
  isSticky, framed = true, items, total,
  bundleDiscountAmount, appliedCoupon, setAppliedCoupon, discountAmount, simchaResult,
  finalTotal, selectedGift, giftOptions, giftEnabled, giftEligible,
  giftThreshold, amountToGift, setSelectedGift,
  couponInput, setCouponInput, applyCoupon, couponLoading, couponError, shaliach,
  pointsAvailable, pointsToUse, setPointsToUse, maxRedeemablePoints, shippingCost, freeShipping,
}: OrderSummaryProps) {
  const [pointsInput, setPointsInput] = useState('');
  return (
    <div style={{ background: '#fff', borderRadius: framed ? 16 : 0, border: framed ? '1px solid #e8e2d8' : 'none', padding: 16, position: isSticky ? 'sticky' : 'static', top: 20, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1E3A8A', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconCart size={15} color="#1E3A8A" /> סיכום הזמנה
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f8f6f2', flexShrink: 0, border: '1px solid #e8e2d8' }}>
              {item.imgUrl ? <img src={optimizeCloudinaryUrl(item.imgUrl, 100)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCart size={18} color="#ccc" /></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A8A', lineHeight: 1.4, overflowWrap: 'break-word' }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#999' }}>כמות: {item.quantity}</div>
              {item.selectedKlafName && <div style={{ fontSize: 10, color: '#1a6b3c', display: 'flex', alignItems: 'center', gap: 3 }}><IconCheck size={9} color="#1a6b3c" /> {item.selectedKlafName}</div>}
              {item.threadColor && <div style={{ fontSize: 10, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: '50%', border: '1px solid #ccc', background: item.threadColor.hex, display: 'inline-block', flexShrink: 0 }} /> צבע חוט: {item.threadColor.id} - {item.threadColor.name}</div>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A', flexShrink: 1, minWidth: 0 }}>{formatPrice(item.price * item.quantity)}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13, color: '#777' }}>
          <span style={{ minWidth: 0 }}>סכום ביניים</span>
          <span style={{ paddingLeft: 4 }}>{formatPrice(total + bundleDiscountAmount)}</span>
        </div>
        {bundleDiscountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>🎁 מבצע כיפות חבילות</span>
            <span style={{ paddingLeft: 4 }}>-{formatPrice(bundleDiscountAmount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13 }}>
          <span style={{ color: '#777', minWidth: 0 }}>משלוח</span>
          {shippingCost === 0 ? (
            freeShipping ? (
              <span style={{ fontWeight: 700, color: '#1a6b3c', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>🚚 משלוח חינם! 🎉</span>
            ) : (
              <span style={{ fontWeight: 700, color: '#1a6b3c', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>🏠 איסוף עצמי · חינם</span>
            )
          ) : (
            <span style={{ fontWeight: 600, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}><IconTruck size={12} color="#1E3A8A" /> עד הבית · {formatPrice(shippingCost)}</span>
          )}
        </div>
        {appliedCoupon && discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}><IconTag size={12} color="#1a6b3c" /> {appliedCoupon.type === 'simcha' ? 'הנחת מבצע SIMCHA' : `קופון (${appliedCoupon.type === 'fixed' ? `₪${appliedCoupon.discount}` : `${appliedCoupon.discount}%`})`}</span>
            <span style={{ paddingLeft: 4 }}>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        {pointsToUse > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>⭐ נקודות מועדון ({pointsToUse} נק')</span>
            <span style={{ paddingLeft: 4 }}>-{formatPrice(pointsToUse)}</span>
          </div>
        )}
        {selectedGift && giftOptions.find(g => g.id === selectedGift) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>🎁 מתנה: {giftOptions.find(g => g.id === selectedGift)!.name}</span>
            <span style={{ paddingLeft: 4 }}>חינם</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 17, fontWeight: 900, color: '#1E3A8A', borderTop: '1px solid #f0ebe0', paddingTop: 10, marginTop: 4 }}>
          <span style={{ minWidth: 0 }}>סה"כ לתשלום</span><span style={{ paddingLeft: 4 }}>{formatPrice(finalTotal)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa' }}>כולל מע"מ</div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><IconTag size={12} color="#555" /> קוד קופון</div>
        {appliedCoupon ? (
          <>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}><IconCheck size={12} color="#15803d" /> {appliedCoupon.code} — {appliedCoupon.type === 'simcha' ? 'מבצע אירועים' : `${appliedCoupon.type === 'fixed' ? `₪${appliedCoupon.discount}` : `${appliedCoupon.discount}%`} הנחה`}</span>
            <button onClick={() => setAppliedCoupon(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><IconX size={14} /></button>
          </div>
          {appliedCoupon.type === 'simcha' && simchaResult && (
            <div style={{ marginTop: 6, background: simchaResult.totalDiscount > 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${simchaResult.totalDiscount > 0 ? '#86efac' : '#fcd34d'}`, borderRadius: 10, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, lineHeight: 1.5, color: simchaResult.totalDiscount > 0 ? '#15803d' : '#92400e' }}>
              {simchaResult.reason}
            </div>
          )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={couponInput} onChange={e => setCouponInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCoupon()} placeholder="הזן קוד קופון" style={{ flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: 'ltr', letterSpacing: 1, fontFamily: 'inherit' }} />
            <button onClick={applyCoupon} disabled={couponLoading} style={{ background: '#FFFFFF', color: '#2446A6', border: '1.5px solid #E7E2D8', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: couponLoading ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {couponLoading ? '...' : 'החל'}
            </button>
          </div>
        )}
        {couponError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 5 }}>{couponError}</div>}
      </div>
      {/* ── מימוש נקודות מועדון — נקודה = ₪1, עד 50% מסכום העגלה ── */}
      {pointsAvailable > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            ⭐ נקודות מועדון
            <span style={{ fontWeight: 400, color: '#999' }}>· יש לך {pointsAvailable.toLocaleString('he-IL')} נק' (נקודה = ₪1)</span>
          </div>
          {pointsToUse > 0 ? (
            <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
              <span style={{ fontSize: 12, color: '#6d28d9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                <IconCheck size={12} color="#6d28d9" /> מומשו {pointsToUse} נקודות — {formatPrice(pointsToUse)} הנחה
              </span>
              <button onClick={() => { setPointsToUse(0); setPointsInput(''); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><IconX size={14} /></button>
            </div>
          ) : maxRedeemablePoints > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={pointsInput}
                  onChange={e => setPointsInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') { const n = Math.min(parseInt(pointsInput) || 0, maxRedeemablePoints); if (n > 0) setPointsToUse(n); } }}
                  placeholder={`עד ${maxRedeemablePoints} נק'`}
                  inputMode="numeric"
                  style={{ flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => { const n = Math.min(parseInt(pointsInput) || 0, maxRedeemablePoints); if (n > 0) setPointsToUse(n); }}
                  style={{ background: '#FFFFFF', color: '#6d28d9', border: '1.5px solid #E7E2D8', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >ממש</button>
                <button
                  onClick={() => { setPointsToUse(maxRedeemablePoints); setPointsInput(String(maxRedeemablePoints)); }}
                  style={{ background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >הכל ({maxRedeemablePoints})</button>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>ניתן לממש עד 50% מסכום העגלה בנקודות</div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#aaa' }}>לא ניתן לממש נקודות בהזמנה זו</div>
          )}
        </div>
      )}
      {/* A4: Gift — progress bar (no giftOptions needed) and selection (requires options) */}
      {giftEnabled && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
          {giftEligible && giftOptions.length > 0 ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6b3c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                🎁 {giftOptions.length === 1 ? 'קיבלת מתנה חינם!' : 'בחר מתנה חינם!'}
              </div>
              {giftOptions.length === 1 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 10px' }}>
                  {giftOptions[0].imgUrl && <img src={optimizeCloudinaryUrl(giftOptions[0].imgUrl, 100)} alt={giftOptions[0].name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{giftOptions[0].name}</span>
                  <span style={{ marginRight: 'auto', fontSize: 12, color: '#1a6b3c', fontWeight: 700 }}>חינם</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {giftOptions.map(g => (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedGift === g.id ? '#f0fdf4' : '#fafafa', border: `1px solid ${selectedGift === g.id ? '#86efac' : '#e0e0e0'}`, borderRadius: 8, padding: '8px 10px' }}>
                      <input type="radio" name="gift" value={g.id} checked={selectedGift === g.id} onChange={() => setSelectedGift(g.id)} style={{ accentColor: '#1a6b3c', flexShrink: 0 }} />
                      {g.imgUrl && <img src={optimizeCloudinaryUrl(g.imgUrl, 100)} alt={g.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{g.name}</span>
                      <span style={{ marginRight: 'auto', fontSize: 12, color: '#1a6b3c', fontWeight: 700 }}>חינם</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : !giftEligible ? (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e' }}>
              🎁 הוסף עוד <strong>{formatPrice(amountToGift)}</strong> לקבלת מתנה חינם
              <div style={{ marginTop: 6, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ background: '#C5A028', height: '100%', width: `${Math.min(100, (total / giftThreshold) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
        <TrustCluster fontSize={11.5} />
      </div>
      {shaliach && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0f7ff', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconHandshake size={13} color="#0e6ba8" />
          <div><div style={{ color: '#0e6ba8', fontWeight: 700 }}>דרך: {shaliach.chabadName || shaliach.name}</div><div style={{ color: '#555', marginTop: 1 }}>10% מהרכישה יועברו כתרומה</div></div>
        </div>
      )}
    </div>
  );
}

/**
 * MobileOrderSummary — סיכום הזמנה בראש מסך ה-Checkout במובייל.
 * הפריטים גלויים תמיד — ללא כפתור הרחבה (שקיפות מלאה: הלקוח רואה מיד מה בהזמנה).
 */
function MobileOrderSummary({ itemCount, finalTotal, children }: {
  itemCount: number;
  finalTotal: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', direction: 'rtl',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#1E3A8A' }}>
          <IconCart size={15} color="#1E3A8A" />
          סיכום ההזמנה
          <span style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>({itemCount} {itemCount === 1 ? 'פריט' : 'פריטים'})</span>
        </span>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#1E3A8A' }}>{formatPrice(finalTotal)}</span>
      </div>
      <div id="mobile-order-summary-panel" style={{ borderTop: '1px solid #f0ebe0' }}>
        {children}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items, total, bundleDiscountAmount,
    giftEnabled, giftThreshold, giftEligible, amountToGift, selectedGift, setSelectedGift,
    appliedCoupon, setAppliedCoupon, couponInput, setCouponInput, applyCoupon, couponLoading, couponError,
    discountAmount, simchaResult,
  } = useCart();
  const { shaliach, refCode } = useShaliach();
  const [loading, setLoading] = useState(false);
  const [bitLoading, setBitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ checkoutEnabled: true, checkoutDisabledMessage: '' });
  // ── מימוש נקודות מועדון — נקודה = ₪1, עד 50% מסכום העגלה (אחרי הנחות, לפני משלוח)
  const [pointsToUse, setPointsToUse] = useState(0);
  const pointsAvailable = user?.loyaltyPoints ?? 0;
  const maxRedeemablePoints = Math.max(0, Math.min(pointsAvailable, Math.floor((total - discountAmount) / 2)));
  // אם העגלה/קופון השתנו והמימוש חורג מהתקרה — הצמד אוטומטית
  useEffect(() => {
    if (pointsToUse > maxRedeemablePoints) setPointsToUse(maxRedeemablePoints);
  }, [pointsToUse, maxRedeemablePoints]);
  const [isMobile, setIsMobile] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });
  // ── אופן קבלת ההזמנה: משלוח עד הבית / איסוף עצמי (האורן 18, ללא דמי משלוח) ──
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping');

  const [sessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('yoursofer_guest_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('yoursofer_guest_id', id); }
    return id;
  });

  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const abandonedSavedRef = useRef(false);
  const [giftOptions, setGiftOptions] = useState<{ id: string; name: string; imgUrl?: string; productId?: string }[]>([]);

  // Fetch site settings (checkout enabled/disabled)
  useEffect(() => {
    getDoc(doc(db, 'siteSettings', 'global'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setSiteSettings({
            checkoutEnabled: d.checkoutEnabled ?? true,
            checkoutDisabledMessage: d.checkoutDisabledMessage ?? '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Read isMobile before first paint to prevent the false→true CLS flip on mobile
  useLayoutEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  // חזרה מביטול תשלום ביט (CancelRedirectURL מחזיר ל-/checkout?bit=cancelled)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('bit') === 'cancelled') {
      setSubmitError('התשלום בביט בוטל — אפשר לנסות שוב או לשלם באשראי');
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onResize() { clearTimeout(timer); timer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150); }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  // Fetch gift options from Firestore (enabled/threshold come from CartContext)
  useEffect(() => {
    getDoc(doc(db, 'siteConfig', 'gifts'))
      .then(snap => { if (snap.exists()) setGiftOptions(snap.data().options ?? []); })
      .catch(() => {});
  }, []);

  // Auto-select when exactly one gift option and user becomes eligible
  useEffect(() => {
    if (giftEligible && giftOptions.length === 1 && !selectedGift) {
      setSelectedGift(giftOptions[0].id);
    }
  }, [giftEligible, giftOptions, selectedGift, setSelectedGift]);

  // Meta Pixel - InitiateCheckout fires once when user enters checkout with items
  useEffect(() => {
    if (items.length === 0) return;
    pixel.initiateCheckout(
      items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      total,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl', background: '#f8f6f2' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#ccc' }}><IconCart size={48} /></div>
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>הסל ריק</div>
          <button onClick={() => router.push('/')} style={{ background: '#FFFFFF', color: '#2446A6', border: '1.5px solid #E7E2D8', borderRadius: 12, height: 48, padding: '0 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>חזרה לחנות</button>
        </div>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function savePartialAbandonedCart(latest?: Partial<typeof form>) {
    const f = { ...formRef.current, ...latest };
    console.log('[abandon] fired', { sessionId, phone: f.phone, email: f.email, items: items.length });
    if (!sessionId || items.length === 0) return;
    if (!f.phone && !f.email) return;

    const isFirst = !abandonedSavedRef.current;
    const cartItemsSnap = items.map(i => ({
      id: i.id, name: i.name, price: i.price, quantity: i.quantity,
      imgUrl: i.imgUrl ?? null,
      printCustomization: i.printCustomization ?? null,
    }));

    setDoc(doc(db, 'abandoned_carts', sessionId), {
      sessionId,
      name: f.name || null,
      phone: f.phone || null,
      email: f.email || null,
      address: f.address ? `${f.address}${f.city ? ', ' + f.city : ''}` : null,
      cartItems: cartItemsSnap,
      cartTotal: total,
      updatedAt: serverTimestamp(),
      converted: false,
      convertedOrderId: null,
      ...(isFirst && { createdAt: serverTimestamp() }),
    }, { merge: true })
      .then(() => {
        if (isFirst) {
          abandonedSavedRef.current = true;
          fetch('/api/notify-abandoned-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: f.name || null,
              phone: f.phone || null,
              email: f.email || null,
              cartItems: cartItemsSnap,
              cartTotal: total,
              sessionId,
            }),
          }).catch(e => console.error('[checkout] notify-abandoned-cart FAILED:', e));
        }
      })
      .catch(e => console.error('[checkout] partial abandoned_cart FAILED:', e));
  }

  // משלוח חינם אוטומטי: הזמנות מעל FREE_SHIPPING_THRESHOLD (אחרי הנחת קופון)
  const freeShippingEligible = total - discountAmount >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = deliveryMethod === 'pickup' || freeShippingEligible ? 0 : SHIPPING_REGULAR;
  const finalTotal = total - discountAmount - pointsToUse + shippingCost;

  // מוצר בהתאמה אישית (רקמה / הטבעה / הדפסה) — משפיע על הודעת תנאי הביטול
  const hasCustomMadeItem = items.some(i =>
    !!i.embroideryText || !!i.embossingText || !!i.printCustomization ||
    (i.embroideryOptions && i.embroideryOptions.length > 0)
  );

  function saveAbandonedCartBeforePayment() {
    if (!sessionId || items.length === 0) return;
    const f = formRef.current;
    setDoc(doc(db, 'abandoned_carts', sessionId), {
      sessionId,
      name: f.name, phone: f.phone, email: f.email,
      address: `${f.address}, ${f.city}`,
      cartItems: items.map(i => ({
        id: i.id, name: i.name, price: i.price, quantity: i.quantity,
        imgUrl: i.imgUrl ?? null,
        printCustomization: i.printCustomization ?? null,
      })),
      cartTotal: total,
      updatedAt: serverTimestamp(),
      converted: false,
      convertedOrderId: null,
      ...(abandonedSavedRef.current ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true }).catch(e => console.error('[checkout] abandoned_cart save FAILED:', e));
  }

  async function handlePaymentToken(singleUseToken: string, paymentsCount: number) {
    setSubmitError(null);
    setLoading(true);
    saveAbandonedCartBeforePayment();
    try {
      const commissionPercent = shaliach?.commissionPercent || 0;
      const gift = selectedGift ? giftOptions.find(g => g.id === selectedGift) : null;

      // מימוש נקודות מחייב טוקן מאומת — השרת מנכה רק מהחשבון המאומת
      let idToken: string | null = null;
      if (pointsToUse > 0) {
        try {
          const { getAuthLazy } = await import('@/lib/authLazy');
          const auth = await getAuthLazy();
          idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        } catch (e) {
          console.error('[checkout] failed to get idToken for points redemption:', e);
        }
        if (!idToken) {
          setSubmitError('מימוש נקודות מחייב התחברות — התחבר מחדש ונסה שוב');
          setLoading(false);
          return;
        }
      }

      const paymentRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singleUseToken, paymentsCount,
          items: [
            ...items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, cat: i.cat || '', bundlePromo: i.bundlePromo || undefined })),
            // תוספות חד־פעמיות (למשל הטבעת הקדשה) — שורה נפרדת בחשבונית
            ...items.flatMap(i => (i.selectedAddons ?? []).filter(a => a.pricing === 'flat').map(a => ({ name: `${a.label} — ${i.name}`, price: a.price, quantity: 1, cat: '' }))),
            ...(bundleDiscountAmount > 0 ? [{ name: 'מבצע כיפות — חבילות',        price: -bundleDiscountAmount, quantity: 1, cat: '' }] : []),
            ...(shippingCost > 0 ? [{ name: 'משלוח', price: shippingCost, quantity: 1, cat: '' }] : []),
            ...(appliedCoupon && discountAmount > 0 ? [{ name: `הנחת קופון — ${appliedCoupon.code}`, price: -discountAmount, quantity: 1, cat: '' }] : []),
            ...(pointsToUse > 0 ? [{ name: 'הנחת נקודות מועדון', price: -pointsToUse, quantity: 1, cat: '' }] : []),
          ],
          total: finalTotal,
          customer: { name: form.name, email: form.email, phone: form.phone },
          couponCode: appliedCoupon?.code || undefined,
          cartItems: items,
          address: deliveryMethod === 'pickup' ? 'איסוף עצמי — האורן 18' : `${form.address}, ${form.city}`,
          notes: form.notes || '',
          selectedGift: selectedGift || null,
          giftLine: gift ? { id: gift.id, name: gift.name, productId: gift.productId } : null,
          shippingCost, shippingType: deliveryMethod === 'pickup' ? 'pickup' : 'regular',
          sessionId,
          refCode: refCode || null, shaliachId: shaliach?.id || null, shaliachName: shaliach?.name || null,
          commissionPercent,
          uid: user?.uid || null,
          pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
          idToken: pointsToUse > 0 ? idToken : undefined,
        }),
      });

      const paymentData = await paymentRes.json();
      if (paymentData.success) {
        router.push(`/thank-you?order=${paymentData.orderNumber}&orderId=${paymentData.orderId}`);
      } else {
        throw new Error(paymentData.error || 'התשלום נכשל');
      }
    } catch (e: any) {
      setSubmitError('שגיאה: ' + (e.message || 'נסה שוב'));
      console.error(e);
      setLoading(false);
    }
  }

  function handlePaymentError(message: string) {
    setSubmitError(message);
    setLoading(false);
  }

  // ── תשלום בביט — יצירת דף תשלום מאובטח ב-Sumit והפניה אליו ──────────────────
  async function handleBitPayment() {
    setSubmitError(null);
    setBitLoading(true);
    saveAbandonedCartBeforePayment();
    try {
      const commissionPercent = shaliach?.commissionPercent || 0;
      const gift = selectedGift ? giftOptions.find(g => g.id === selectedGift) : null;

      // מימוש נקודות מחייב טוקן מאומת — השרת מנכה רק מהחשבון המאומת
      let idToken: string | null = null;
      if (pointsToUse > 0) {
        try {
          const { getAuthLazy } = await import('@/lib/authLazy');
          const auth = await getAuthLazy();
          idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        } catch (e) {
          console.error('[checkout] failed to get idToken for points redemption:', e);
        }
        if (!idToken) {
          setSubmitError('מימוש נקודות מחייב התחברות — התחבר מחדש ונסה שוב');
          setBitLoading(false);
          return;
        }
      }

      const res = await fetch('/api/payment/bit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            ...items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, cat: i.cat || '', bundlePromo: i.bundlePromo || undefined })),
            // תוספות חד־פעמיות (למשל הטבעת הקדשה) — שורה נפרדת בחשבונית
            ...items.flatMap(i => (i.selectedAddons ?? []).filter(a => a.pricing === 'flat').map(a => ({ name: `${a.label} — ${i.name}`, price: a.price, quantity: 1, cat: '' }))),
            ...(bundleDiscountAmount > 0 ? [{ name: 'מבצע כיפות — חבילות',        price: -bundleDiscountAmount, quantity: 1, cat: '' }] : []),
            ...(shippingCost > 0 ? [{ name: 'משלוח', price: shippingCost, quantity: 1, cat: '' }] : []),
            ...(appliedCoupon && discountAmount > 0 ? [{ name: `הנחת קופון — ${appliedCoupon.code}`, price: -discountAmount, quantity: 1, cat: '' }] : []),
            ...(pointsToUse > 0 ? [{ name: 'הנחת נקודות מועדון', price: -pointsToUse, quantity: 1, cat: '' }] : []),
          ],
          total: finalTotal,
          customer: { name: form.name, email: form.email, phone: form.phone },
          couponCode: appliedCoupon?.code || undefined,
          cartItems: items,
          address: deliveryMethod === 'pickup' ? 'איסוף עצמי — האורן 18' : `${form.address}, ${form.city}`,
          notes: form.notes || '',
          selectedGift: selectedGift || null,
          giftLine: gift ? { id: gift.id, name: gift.name, productId: gift.productId } : null,
          shippingCost, shippingType: deliveryMethod === 'pickup' ? 'pickup' : 'regular',
          sessionId,
          refCode: refCode || null, shaliachId: shaliach?.id || null, shaliachName: shaliach?.name || null,
          commissionPercent,
          uid: user?.uid || null,
          pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
          idToken: pointsToUse > 0 ? idToken : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        // הפניה לדף התשלום המאובטח של ביט (Sumit)
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'שגיאה ביצירת התשלום בביט');
      }
    } catch (e: any) {
      setSubmitError('שגיאה: ' + (e.message || 'נסה שוב'));
      console.error(e);
      setBitLoading(false);
    }
  }

  const isFormValid = !!(form.name && form.email && form.phone && (deliveryMethod === 'pickup' || (form.address && form.city)));

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      {/* Header */}
      <div style={{ background: '#1E3A8A', padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#C5A028', fontWeight: 700, letterSpacing: 1 }}>ישראל ✡</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C5A028', fontWeight: 700 }}>
          <IconLock size={13} color="#C5A028" />
          תשלום מאובטח
        </div>
        <button onClick={() => router.push('/cart')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', fontSize: 12, cursor: 'pointer', borderRadius: 8, padding: '5px 12px' }}>חזרה לסל</button>
      </div>

      {shaliach && (
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', borderBottom: '2px solid #C5A028', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box' }}>
          <IconHandshake size={16} color="#C5A028" />
          <div style={{ fontSize: 13, color: '#a8c0d8' }}>
            הזמנה זו מיוחסת לרב הקהילה: <strong style={{ color: '#fff' }}>{shaliach.chabadName || shaliach.name}</strong>
            {shaliach.city && <span style={{ color: '#C5A028' }}> · {shaliach.city}</span>}
          </div>
        </div>
      )}

      {/* Centering wrapper — flex justify-center is RTL-safe on iOS Safari; margin:auto alone isn't */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {/* Main layout — single-column mobile, two-column desktop */}
      <div className="checkout-grid" style={{
        maxWidth: 1100, marginTop: 20, marginBottom: 20, padding: isMobile ? '0 12px' : '0 16px',
        width: '100%', boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: 20, alignItems: 'start',
      }}>

        {/* Order summary first on mobile so user sees total before filling form.
            Collapsible: item count + final total always visible in the header. */}
        <div className="checkout-summary-mobile" style={{ display: isMobile ? 'block' : 'none' }}>
          <MobileOrderSummary itemCount={items.reduce((s, i) => s + i.quantity, 0)} finalTotal={finalTotal}>
            <OrderSummary isSticky={false} framed={false} items={items} total={total} bundleDiscountAmount={bundleDiscountAmount} appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon} discountAmount={discountAmount} simchaResult={simchaResult} finalTotal={finalTotal} selectedGift={selectedGift} giftOptions={giftOptions} giftEnabled={giftEnabled} giftEligible={giftEligible} giftThreshold={giftThreshold} amountToGift={amountToGift} setSelectedGift={setSelectedGift} couponInput={couponInput} setCouponInput={setCouponInput} applyCoupon={applyCoupon} couponLoading={couponLoading} couponError={couponError} shaliach={shaliach} pointsAvailable={pointsAvailable} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse} maxRedeemablePoints={maxRedeemablePoints} shippingCost={shippingCost} freeShipping={freeShippingEligible && deliveryMethod !== 'pickup'} />
          </MobileOrderSummary>
        </div>

        {/* Shipping form */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}>
          {/* Form header with call-to-action subtitle */}
          <div style={{ background: '#f8f6f2', borderBottom: '1px solid #e8e2d8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C5A028', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>📦</div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1E3A8A', margin: 0 }}>פרטי משלוח</h2>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C5A028', marginTop: 3 }}>למלא פרטים ולהתקדם לרכישה</div>
            </div>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Input label="שם מלא" name="name" value={form.name} onChange={handleChange} onBlur={(e) => savePartialAbandonedCart({ name: e.target.value })} placeholder="ישראל ישראלי" autoComplete="name" required />
              <Input label="טלפון" name="phone" value={form.phone} onChange={handleChange} onBlur={(e) => savePartialAbandonedCart({ phone: e.target.value })} placeholder="050-0000000" type="tel" inputMode="tel" autoComplete="tel" required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Input label="אימייל" name="email" value={form.email} onChange={handleChange} onBlur={(e) => savePartialAbandonedCart({ email: e.target.value })} placeholder="your@email.com" type="email" inputMode="email" autoComplete="email" required />
            </div>
            {/* ── בחירת אופן קבלת ההזמנה: משלוח / איסוף עצמי ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <button type="button" onClick={() => setDeliveryMethod('shipping')}
                style={{
                  border: deliveryMethod === 'shipping' ? '2px solid #1E3A8A' : '1.5px solid #e0e0e0',
                  background: deliveryMethod === 'shipping' ? '#f4f7ff' : '#fafafa',
                  borderRadius: 12, padding: '12px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1E3A8A' }}>🚚 משלוח עד הבית</div>
                <div style={{ fontSize: 12, color: freeShippingEligible ? '#1a6b3c' : '#777', fontWeight: freeShippingEligible ? 700 : 400, marginTop: 3 }}>
                  {freeShippingEligible ? 'חינם! 🎉 (הזמנה מעל ₪600)' : formatPrice(SHIPPING_REGULAR)}
                </div>
              </button>
              <button type="button" onClick={() => setDeliveryMethod('pickup')}
                style={{
                  border: deliveryMethod === 'pickup' ? '2px solid #1a6b3c' : '1.5px solid #e0e0e0',
                  background: deliveryMethod === 'pickup' ? '#f2faf5' : '#fafafa',
                  borderRadius: 12, padding: '12px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1a6b3c' }}>🏠 איסוף עצמי</div>
                <div style={{ fontSize: 12, color: '#1a6b3c', fontWeight: 700, marginTop: 3 }}>האורן 18 · ללא עלות משלוח</div>
              </button>
            </div>
            {deliveryMethod === 'pickup' && (
              <div style={{ background: '#f2faf5', border: '1px solid #bbe3c8', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1a6b3c', marginBottom: 14, lineHeight: 1.6 }}>
                ההזמנה תמתין לאיסוף בכתובת <strong>האורן 18</strong>. נעדכן אותך כשהיא מוכנה לאיסוף.
              </div>
            )}
            {deliveryMethod === 'shipping' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 14, marginBottom: 14 }}>
                <Input label="רחוב ומספר בית" name="address" value={form.address} onChange={handleChange} onBlur={(e) => savePartialAbandonedCart({ address: e.target.value })} placeholder="רחוב הרצל 5" autoComplete="street-address" required />
                <Input label="עיר" name="city" value={form.city} onChange={handleChange} onBlur={(e) => savePartialAbandonedCart({ city: e.target.value })} placeholder="תל אביב" autoComplete="address-level2" required />
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 }}>הערות למשלוח</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="הוראות מיוחדות, קומה, דירה..." rows={2}
                style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafafa', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#C5A028')}
                onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0'; savePartialAbandonedCart(); }} />
            </div>

            {/* Payment error banner */}
            {submitError && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600, lineHeight: 1.5 }}>{submitError}</div>
              </div>
            )}

            {/* ── Checkout disabled banner ─────────────────────────────────── */}
            {!siteSettings.checkoutEnabled && (
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: '#9a3412', fontWeight: 700, marginBottom: 4 }}>
                  🔒 הרכישות זמנית אינן זמינות
                </div>
                <div style={{ fontSize: 13, color: '#7c2d12', lineHeight: 1.5 }}>
                  {siteSettings.checkoutDisabledMessage ||
                    'הרכישות באתר אינן זמינות כעת. ניתן לעיין במוצרים, והאפשרות להזמנה תחזור בקרוב.'}
                </div>
                {user?.role === 'admin' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#b45309', fontWeight: 700 }}>
                    [אדמין] המתג כבוי — שנה ב: <a href="/admin" style={{ color: '#b45309', textDecoration: 'underline' }}>לוח הבקרה</a>
                  </div>
                )}
              </div>
            )}

            {/* Security notice */}
            {siteSettings.checkoutEnabled && (
              <div style={{ marginBottom: 16 }}>
                <SecurePaymentNotice />
              </div>
            )}

            {/* Delivery estimate */}
            {siteSettings.checkoutEnabled && (
              <div style={{ marginBottom: 16 }}>
                <DeliveryEstimate customMade={hasCustomMadeItem} />
              </div>
            )}

            {/* מוצרים בהתאמה אישית — תנאי ביטול שונים (לפי מדיניות האתר) */}
            {siteSettings.checkoutEnabled && hasCustomMadeItem && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                ההזמנה כוללת מוצר בהתאמה אישית (רקמה / הטבעה / הדפסה). תנאי הביטול עשויים להיות שונים ממוצר רגיל.
                {' '}
                <a href="/legal/returns" style={{ color: '#92400e', fontWeight: 700, textDecorationLine: 'underline', textUnderlineOffset: 2 }}>לפרטי מדיניות הביטולים</a>
              </div>
            )}

            {/* Call-to-action heading above card form */}
            {siteSettings.checkoutEnabled && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A8A', textAlign: 'center', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <IconCreditCard size={16} color="#1E3A8A" /> פרטי תשלום
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PaymentMethodsRow size="sm" />
                </div>
              </div>
            )}

            {siteSettings.checkoutEnabled && (
              !isFormValid ? (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>
                  למלא את פרטי המשלוח למעלה כדי להמשיך לתשלום
                </div>
              ) : (
                <>
                  <SumitPaymentForm
                    companyId={Number(process.env.NEXT_PUBLIC_SUMIT_COMPANY_ID)}
                    apiPublicKey={process.env.NEXT_PUBLIC_SUMIT_API_PUBLIC_KEY || ''}
                    disabled={loading || bitLoading}
                    onToken={handlePaymentToken}
                    onError={handlePaymentError}
                  />

                  {/* ── או תשלום בביט ─────────────────────────────────────── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
                    <div style={{ flex: 1, height: 1, background: '#e8e2d8' }} />
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>או</span>
                    <div style={{ flex: 1, height: 1, background: '#e8e2d8' }} />
                  </div>
                  <button
                    type="button"
                    onClick={handleBitPayment}
                    disabled={loading || bitLoading}
                    style={{
                      width: '100%',
                      background: (loading || bitLoading) ? '#888' : 'linear-gradient(135deg, #00d1c5, #00a3e0)',
                      color: '#fff', border: 'none', borderRadius: 14, height: 52,
                      fontSize: 16, fontWeight: 800,
                      cursor: (loading || bitLoading) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {bitLoading ? 'מעביר לתשלום בביט...' : (
                      <>
                        תשלום בביט
                        <span style={{
                          background: '#fff', color: '#00a3e0', borderRadius: 8,
                          padding: '1px 9px', fontSize: 15, fontWeight: 900,
                          fontFamily: 'Arial, sans-serif', direction: 'ltr',
                        }}>bit</span>
                      </>
                    )}
                  </button>
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                    תועברו לדף תשלום מאובטח של ביט, ואחרי האישור תוחזרו לאתר
                  </div>
                </>
              )
            )}
            {siteSettings.checkoutEnabled && (
              <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <IconLock size={12} color="#6b7280" /> תשלום מאובטח · אישור הזמנה מיידי במייל
              </div>
            )}
          </div>
        </div>

        {/* Order summary — desktop: sticky right column; mobile: hidden via CSS */}
        <div className="checkout-summary-desktop" style={{ display: isMobile ? 'none' : 'block' }}>
          <OrderSummary isSticky={!isMobile} items={items} total={total} bundleDiscountAmount={bundleDiscountAmount} appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon} discountAmount={discountAmount} simchaResult={simchaResult} finalTotal={finalTotal} selectedGift={selectedGift} giftOptions={giftOptions} giftEnabled={giftEnabled} giftEligible={giftEligible} giftThreshold={giftThreshold} amountToGift={amountToGift} setSelectedGift={setSelectedGift} couponInput={couponInput} setCouponInput={setCouponInput} applyCoupon={applyCoupon} couponLoading={couponLoading} couponError={couponError} shaliach={shaliach} pointsAvailable={pointsAvailable} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse} maxRedeemablePoints={maxRedeemablePoints} shippingCost={shippingCost} freeShipping={freeShippingEligible && deliveryMethod !== 'pickup'} />
        </div>
      </div>

      </div>{/* /centering wrapper */}

      {/* FAQ קומפקטי לעמוד התשלום — מחוץ ל-flex wrapper כדי שיופיע מתחת לטופס ולא לצידו */}
      <PageFaqSection pageKey="checkout" title="שאלות נפוצות על תשלום ומשלוח" max={6} showWhatsAppCta={false} />
    </div>
  );
}
