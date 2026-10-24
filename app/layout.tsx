import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Divine Links | Your world. Better connected.",
  description: "Telecom enquiries and tailored networking solutions for homes and businesses.",
  applicationName: "Divine Links"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen bg-white text-divine-ink antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
