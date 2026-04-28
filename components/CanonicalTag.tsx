'use client';
import { usePathname } from 'next/navigation';

const BASE_URL = 'https://your-sofer.com';

export function CanonicalTag() {
  const pathname = usePathname();
  const canonical = `${BASE_URL}${pathname}`;
  return <link rel="canonical" href={canonical} />;
}
