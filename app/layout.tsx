import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ShaliachProvider } from "./contexts/ShaliachContext";

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
        <script src="//code.tidio.co/i6evth9lfvxovmfpvcftjeb25pw4psme.js" async></script>
      </body>
    </html>
  );
}