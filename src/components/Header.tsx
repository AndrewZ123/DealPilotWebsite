"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import TickerBar from "./TickerBar";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50">
      <TickerBar />
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="DealPilot"
              width={36}
              height={36}
              className="rounded-lg transition group-hover:scale-105"
              priority
            />
            <div>
              <span className="text-lg font-bold text-gray-900">Deal</span>
              <span className="text-lg font-bold text-brand-700">Pilot</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand-700"
            >
              All Deals
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand-700"
              >
                {cat.name}
              </Link>
            ))}
            <div className="mx-2 h-5 w-px bg-gray-200" />
            <Link
              href="/about"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-brand-700"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-brand-700"
            >
              Contact
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-brand-700 md:hidden transition"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="border-t border-gray-100 bg-white px-4 py-4 md:hidden shadow-lg">
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-700"
                onClick={() => setMenuOpen(false)}
              >
                🏠 All Deals
              </Link>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => setMenuOpen(false)}
                >
                  {cat.icon} {cat.name}
                </Link>
              ))}
              <div className="my-2 border-t border-gray-100" />
              <Link
                href="/about"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                About DealPilot
              </Link>
              <Link
                href="/contact"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Contact Us
              </Link>
              <Link
                href="/disclosure"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Affiliate Disclosure
              </Link>
            </div>
          </nav>
        )}
      </header>
    </div>
  );
}