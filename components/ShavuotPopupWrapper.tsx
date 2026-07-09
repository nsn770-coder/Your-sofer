'use client';

// PERF: ShavuotPopup is currently disabled inside the component itself
// (its trigger useEffect is commented out — "popup disabled" — so `visible`
// can never become true). It still shipped its JS chunk + Firestore imports
// to every page for nothing. Short-circuit here so the chunk isn't downloaded.
//
// To re-enable the popup, restore:
//   import dynamic from 'next/dynamic';
//   const ShavuotPopup = dynamic(() => import('./ShavuotPopup'), { ssr: false });
//   return <ShavuotPopup />;
// (and re-enable the trigger inside ShavuotPopup.tsx).
export default function ShavuotPopupWrapper() {
  return null;
}
