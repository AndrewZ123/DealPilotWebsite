import { supabase } from "@/lib/db";
import DealGrid from "@/components/DealGrid";
import DisclosureBanner from "@/components/DisclosureBanner";
import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";

// ISR: revalidate every 15 minutes (900 s) — balances freshness with performance
export const revalidate = 900;

const PAGE_SIZE = 18;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1"));

  const { data: deals, count: total } = await supabase
    .from("deals")
    .select("id, slug, title, description, store, originalPrice, salePrice, discountPercent, category, imageUrl, createdAt", { count: "exact" })
    .eq("active", true)
    .order("createdAt", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const dealList = deals ?? [];
  const totalCount = total ?? 0;

  // Generalized count: "200+" until 300+, "300+" until 400+, etc.
  const displayCount = totalCount >= 100
    ? `${Math.floor(totalCount / 100) * 100}+`
    : String(totalCount);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 backdrop-blur mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Live — {displayCount} deals updated minutes ago
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Never Overpay for
              <br />
              <span className="text-brand-200">Anything Again</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100/80 leading-relaxed">
              DealPilot scours top retailers to surface the steepest discounts
              on Tech, Home, Fashion, and more. Real deals, real savings — updated
              throughout the day so you always get the best price.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#deals"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-brand-700 shadow-xl shadow-brand-900/30 transition-all hover:scale-105 hover:shadow-2xl"
              >
                Browse All Deals
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </a>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-8 py-4 text-base font-bold text-white transition-all hover:bg-white/10"
              >
                How It Works
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─── CATEGORY CARDS ─── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-md border border-gray-100 transition-all hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5"
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <div className="font-bold text-gray-900 text-sm group-hover:text-brand-700 transition">{cat.name}</div>
                <div className="text-xs text-gray-400">Shop deals</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── MAIN DEALS AREA ─── */}
      <section id="deals" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
              Today's Best Deals
            </h2>
            <p className="mt-1 text-gray-500">
              Hand-picked offers refreshed every few hours. Prices verified at time of posting.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-gray-500">Updated recently</span>
          </div>
        </div>

        {/* Disclosure */}
        <DisclosureBanner />

        {/* Deal grid */}
        <div className="mt-8">
          <DealGrid
            deals={dealList.map((d) => ({ ...d, createdAt: new Date(d.createdAt).toISOString() }))}
            emptyMessage="No deals right now — check back soon for fresh discounts!"
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-3">
            {page > 1 && (
              <a
                href={`/?page=${page - 1}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-brand-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Newer
              </a>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => {
                  const showEllipsis = i > 0 && arr[i - 1] !== p - 1;
                  return (
                    <span key={p} className="flex items-center">
                      {showEllipsis && <span className="px-2 text-gray-300">…</span>}
                      <a
                        href={`/?page=${p}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                          p === page
                            ? "bg-brand-700 text-white shadow-lg shadow-brand-700/25"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </a>
                    </span>
                  );
                })}
            </div>
            {page < totalPages && (
              <a
                href={`/?page=${page + 1}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-brand-300"
              >
                Older
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            )}
          </nav>
        )}
      </section>

      {/* ─── NEWSLETTER / CTA ─── */}
      <section className="bg-gradient-to-br from-brand-50 to-white border-t border-brand-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block text-4xl mb-4">📬</span>
            <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
              Get the Best Deals in Your Inbox
            </h2>
            <p className="mt-3 text-gray-500">
              Join thousands of smart shoppers. We'll send you the top deals
              every morning — no spam, just savings.
            </p>
            {/* TODO: Wire up newsletter subscription to an email service (e.g. Resend, Mailchimp) */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                disabled
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="rounded-xl bg-gray-300 px-6 py-3 text-sm font-bold text-gray-500 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Free forever. Unsubscribe anytime.{" "}
              <Link href="/disclosure" className="underline hover:text-gray-500">
                Affiliate Disclosure
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}