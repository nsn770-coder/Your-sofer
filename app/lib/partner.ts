// ============================================
// Partner Helper Functions
// ============================================

import type { Partner, PartnerStatus, SubscriptionStatus } from './partner-types';

export function getPartnerStatusLabel(status: PartnerStatus): string {
  const labels: Record<PartnerStatus, string> = {
    draft: 'טיוטה',
    pending_payment: 'ממתינה לתשלום',
    payment_received: 'תשלום התקבל',
    pending_review: 'ממתינה לאישור',
    active: 'פעילה',
    past_due: 'פרעון עתידי',
    suspended: 'מושהה',
    cancelled: 'בטלה',
    blocked: 'חסומה',
    expired: 'פגה תוקף',
  };
  return labels[status] || status;
}

export function getPartnerStatusColor(status: PartnerStatus): string {
  const colors: Record<PartnerStatus, string> = {
    draft: 'gray',
    pending_payment: 'yellow',
    payment_received: 'blue',
    pending_review: 'orange',
    active: 'green',
    past_due: 'red',
    suspended: 'red',
    cancelled: 'gray',
    blocked: 'red',
    expired: 'gray',
  };
  return colors[status] || 'gray';
}

export function getPartnerStatusEmoji(status: PartnerStatus): string {
  const emojis: Record<PartnerStatus, string> = {
    draft: '📝',
    pending_payment: '⏳',
    payment_received: '✅',
    pending_review: '👀',
    active: '🟢',
    past_due: '⚠️',
    suspended: '🔴',
    cancelled: '❌',
    blocked: '🚫',
    expired: '⏰',
  };
  return emojis[status] || '❓';
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    active: 'פעילה',
    past_due: 'פרעון עתידי',
    suspended: 'מושהה',
    cancelled: 'בטלה',
    expired: 'פגה תוקף',
  };
  return labels[status] || status;
}

export function isPartnerActive(partner: Partner | null): boolean {
  return partner?.status === 'active' && partner?.isPublished;
}

export function canPartnerPublish(partner: Partner | null): boolean {
  if (!partner) return false;
  return Boolean(
    partner.storeName &&
    partner.logoUrl &&
    partner.colors &&
    partner.onboarding.nameComplete &&
    partner.onboarding.logoComplete &&
    partner.onboarding.colorsComplete
  );
}

export function getOnboardingProgress(partner: Partner | null): number {
  if (!partner) return 0;
  const { onboarding } = partner;
  const steps = [
    onboarding.nameComplete,
    onboarding.logoComplete,
    onboarding.colorsComplete,
    onboarding.whatsappComplete,
    onboarding.published,
  ];
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

export function getOnboardingNextStep(partner: Partner | null): string | null {
  if (!partner) return 'name';
  const { onboarding } = partner;

  if (!onboarding.nameComplete) return 'name';
  if (!onboarding.logoComplete) return 'logo';
  if (!onboarding.colorsComplete) return 'colors';
  if (!onboarding.whatsappComplete) return 'whatsapp';
  if (!onboarding.published) return 'publish';
  return null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generateStoreUrl(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^א-תװ-״\w]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateStoreUrl(url: string): boolean {
  // Only alphanumeric and hyphens, 3-50 chars
  return /^[a-z0-9-]{3,50}$/.test(url);
}

export function validateHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  // Simplified contrast ratio calculation
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const COLOR_PALETTES = [
  {
    name: 'Luxury Gold',
    colors: { primary: '#2D1B00', secondary: '#DAA520', cta: '#FFD700' },
  },
  {
    name: 'Black & Gold',
    colors: { primary: '#000000', secondary: '#C0A080', cta: '#DAA520' },
  },
  {
    name: 'Emerald',
    colors: { primary: '#1B4332', secondary: '#52B788', cta: '#74C69D' },
  },
  {
    name: 'Royal Blue',
    colors: { primary: '#003A7A', secondary: '#0072B2', cta: '#0099F7' },
  },
  {
    name: 'Burgundy',
    colors: { primary: '#5C2E3A', secondary: '#A85A6A', cta: '#C68A8A' },
  },
  {
    name: 'Sand',
    colors: { primary: '#8B7355', secondary: '#D4C5B9', cta: '#E8DCC8' },
  },
  {
    name: 'Minimal Black',
    colors: { primary: '#1A1A1A', secondary: '#555555', cta: '#000000' },
  },
  {
    name: 'Classic',
    colors: { primary: '#2C3E50', secondary: '#3498DB', cta: '#27AE60' },
  },
];
