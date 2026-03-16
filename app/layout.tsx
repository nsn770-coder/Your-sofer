import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "./AuthContext";
import { ShaliachProvider } from "./ShaliachContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your Sofer — חנות סת\"מ",
  description: "רכישת סת\"מ מסופרים מוסמכים",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={geist.className}>
        <AuthProvider>
          <ShaliachProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ShaliachProvider>
        </AuthProvider>
      </body>
    </html>
  );
}