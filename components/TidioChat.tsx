'use client';
import Script from 'next/script';

export function TidioChat() {
  if (!process.env.NEXT_PUBLIC_TIDIO_KEY) return null;
  return (
    <Script
      src={`//code.tidio.co/${process.env.NEXT_PUBLIC_TIDIO_KEY}.js`}
      strategy="lazyOnload"
    />
  );
}
