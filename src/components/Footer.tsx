import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm transition group-hover:bg-brand-500">
                DP
              </div>
              <div>
                <span className="text-lg font-bold text-white">Deal</span>
                <span className="text-lg font-bold text-brand-400">Pilot</span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Your curated deal radar. We track prices across top retailers so
              you always get the best price — no more second-guessing.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                </span>
                Monitoring deals live
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Categories
            </h3>
            <ul className="mt-4 space-y-3">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-gray-400 hover:text-brand-400 transition flex items-center gap-2"
                  >
                    <span>{cat.icon}</span>
                    {cat.name} Deals
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="text-sm text-gray-400 hover:text-brand-400 transition">
                  About DealPilot
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-brand-400 transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/disclosure" className="text-sm text-gray-400 hover:text-brand-400 transition">
                  Affiliate Disclosure
                </Link>
              </li>
            </ul>
          </div>

          {/* Disclosure summary */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Transparency
            </h3>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Some links on DealPilot may be affiliate links. We may earn a
              commission at no extra cost to you if you purchase through them.
              Prices and availability are subject to change.
            </p>
            <Link
              href="/disclosure"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300 transition"
            >
              Read full disclosure
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} DealPilot. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Prices shown are accurate at time of publication and may vary.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}