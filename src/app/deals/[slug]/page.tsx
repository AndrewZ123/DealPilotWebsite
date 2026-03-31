import { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/db";
import { notFound } from "next/navigation";

// ISR: revalidate every 15 minutes (900 s)
export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  if (!deal) return { title: "Deal Not Found" };

  return {
    title: `${deal.title} — ${deal.discountPercent}% Off`,
    description: deal.description,
    openGraph: {
      title: `${deal.title} — ${deal.discountPercent}% Off`,
      description: `Was $${deal.originalPrice.toFixed(2)}, now $${deal.salePrice.toFixed(2)} at ${deal.store}. ${deal.description}`,
      images: undefined,
      type: "article",
    },
  };
}

export default async function DealDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!deal) notFound();

  const savings = deal.originalPrice - deal.salePrice;
  const isHotDeal = deal.discountPercent >= 80;
  const postedDate = new Date(deal.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Get a few related deals from the same category
  const { data: relatedData } = await supabase
    .from("deals")
    .select("id, slug, title, salePrice, originalPrice, discountPercent, imageUrl, store")
    .eq("category", deal.category)
    .eq("active", true)
    .neq("id", deal.id)
    .order("createdAt", { ascending: false })
    .limit(3);

  const related = relatedData ?? [];

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: deal.title,
    description: deal.description,
    url: `https://dealpilot.org/deals/${deal.slug}`,
    priceCurrency: "USD",
    price: deal.salePrice.toFixed(2),
    highPrice: deal.originalPrice.toFixed(2),
    offeredBy: {
      "@type": "Organization",
      name: deal.store,
    },
    seller: {
      "@type": "Organization",
      name: "DealPilot",
      url: "https://dealpilot.org",
    },
    availability: "https://schema.org/InStock",
    validFrom: deal.createdAt,
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 text-sm">
          <ol className="flex items-center gap-2 text-gray-400">
            <li>
              <Link href="/" className="hover:text-brand-700 transition">Home</Link>
            </li>
            <li>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </li>
            <li>
              <Link href={`/category/${deal.category.toLowerCase()}`} className="hover:text-brand-700 transition">
                {deal.category}
              </Link>
            </li>
            <li>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </li>
            <li className="text-gray-600 font-medium truncate max-w-xs">{deal.title}</li>
          </ol>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Badges */}
          <div className="flex items-center gap-2">
            {isHotDeal && (
              <span className="animate-bounce-subtle inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                🔥 Hot Deal
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              -{deal.discountPercent}% OFF
            </span>
          </div>

          <div className="space-y-6">
            {/* Category pill + store */}
            <div className="flex items-center gap-3">
              <Link
                href={`/category/${deal.category.toLowerCase()}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                {deal.category}
              </Link>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h6a.75.75 0 01.75.75V21m-6 0H9m4.5 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 6.75h.375a1.125 1.125 0 001.125-1.125v-1.875m-17.25 3.375V6.75a1.125 1.125 0 011.125-1.125h12.75a1.125 1.125 0 011.125 1.125v12" />
                </svg>
                {deal.store}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl leading-tight">
              {deal.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Posted {postedDate}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">{deal.description}</p>

            {/* Price card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Sale Price</div>
                  <span className="text-4xl font-black text-gray-900">
                    ${deal.salePrice.toFixed(2)}
                  </span>
                  <span className="ml-3 text-lg text-gray-400 line-through">
                    ${deal.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-center">
                  <div className="text-lg font-black text-green-700">-{deal.discountPercent}%</div>
                  <div className="text-xs font-medium text-green-600">Save ${savings.toFixed(2)}</div>
                </div>
              </div>

              {/* Savings bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Deal savings</span>
                  <span className="font-semibold text-green-600">{deal.discountPercent}% off retail</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(deal.discountPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/go/${deal.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold text-white transition-all duration-200 ${
                  isHotDeal
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                    : "bg-brand-700 hover:bg-brand-800 shadow-lg shadow-brand-700/25"
                } hover:scale-[1.02] active:scale-[0.98]`}
              >
                {isHotDeal ? "🔥 Grab This Deal Now" : "Go to Deal"}
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>

              {/* Inline disclosure */}
              <p className="mt-4 text-center text-xs text-gray-400 leading-relaxed">
                Disclosure: This link may be an affiliate link. We may earn a commission
                if you purchase through it at no extra cost to you. Prices may change at any time.
              </p>
            </div>

          </div>
        </div>

        {/* Related deals */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-black text-gray-900 mb-6">
              More {deal.category} Deals
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/deals/${r.slug}`}
                  className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm transition-all hover:shadow-md hover:border-brand-200"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-700 transition truncate">
                      {r.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">${r.salePrice.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 line-through">${r.originalPrice.toFixed(2)}</span>
                      <span className="text-xs font-bold text-green-600">-{r.discountPercent}%</span>
                    </div>
                    <div className="text-xs text-gray-400">{r.store}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}