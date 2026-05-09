'use client';
import dynamic from 'next/dynamic';
const ShavuotPopup = dynamic(() => import('./ShavuotPopup'), { ssr: false });
export default function ShavuotPopupWrapper() {
  return <ShavuotPopup />;
}
