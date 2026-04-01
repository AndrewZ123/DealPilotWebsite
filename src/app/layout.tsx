import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "DealPilot: Curated Deals & Discounts",
    template: "%s | DealPilot",
  },
  description:
    "DealPilot tracks prices across top retailers to surface the best discounts on Tech, Home, Fashion, Toys, and more.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DealPilot",
    images: [
      {
        url: "https://dealpilot.org/logo.png",
        width: 1200,
        height: 630,
        alt: "DealPilot — Curated Deals & Discounts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DealPilot: Curated Deals & Discounts",
    description:
      "DealPilot tracks prices across top retailers to surface the best discounts on Tech, Home, Fashion, Toys, and more.",
    images: ["https://dealpilot.org/logo.png"],
  },
  other: {
    "impact-site-verification": "dafb96f1-a3a0-44a8-85d1-9a6519c8d754",
    "fo-verify": "3f3394bf-1501-4ad6-9e75-b60a244a44fd",
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