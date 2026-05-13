import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'סט בר מצווה מהודר | Your Sofer',
  description: 'תפילין כשרים בכתיבת סופר מוסמך — שקיפות מלאה, שירות אישי, תעודת כשרות. 500+ משפחות בחרו בנו.',
};

const WA_URL = 'https://wa.me/972552722228?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%AA%D7%A2%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A1%D7%98%20%D7%91%D7%A8%20%D7%9E%D7%A6%D7%95%D7%95%D7%94';

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

export default function BarMitzvahLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-[#1E3A8A] sticky top-0 z-50 border-b border-white/10">
        <div
          className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"
          dir="rtl"
        >
          <a href="/" className="flex items-center gap-2 text-white no-underline">
            <Image
              src="/logo.png"
              alt="Your Sofer"
              width={40}
              height={40}
              className="h-8 w-auto"
            />
            <span className="font-bold text-base hidden sm:block">Your Sofer</span>
          </a>

          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white text-sm font-bold px-4 py-2 rounded-full no-underline"
          >
            {WA_ICON}
            <span className="hidden sm:inline">שאלות? נשמח לעזור</span>
            <span className="sm:hidden">וואטסאפ</span>
          </a>
        </div>
      </header>

      {children}
    </>
  );
}
