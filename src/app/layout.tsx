import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "DealPilot — Curated Deals & Discounts",
    template: "%s | DealPilot",
  },
  description:
    "DealPilot tracks prices across top retailers to surface the best discounts on Tech, Home, Fashion, Toys, and more.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DealPilot",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}