'use client';
import dynamic from 'next/dynamic';
const ClubPopup = dynamic(() => import('./ClubPopup'), { ssr: false });
export default function ClubPopupWrapper() {
  return <ClubPopup />;
}
