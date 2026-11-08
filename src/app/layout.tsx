import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import "@/styles/globals.css";
import { SITE_CONFIG } from "@/config/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | IHGC 2026 — Horemow",
    default: `${SITE_CONFIG.eventTitle} — ${SITE_CONFIG.shortBrandName}`,
  },
  description: `${SITE_CONFIG.eventTitle}. Theme: "${SITE_CONFIG.theme}". ${SITE_CONFIG.datesText} at ${SITE_CONFIG.venue.name}, ${SITE_CONFIG.venue.location}.`,
  openGraph: {
    title: SITE_CONFIG.eventTitle,
    description: `Theme: "${SITE_CONFIG.theme}". ${SITE_CONFIG.datesText}.`,
    type: "website",
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white text-[#111320] antialiased selection:bg-[#8EE3D6] selection:text-[#0E1020]">
        {children}
      </body>
    </html>
  );
}

