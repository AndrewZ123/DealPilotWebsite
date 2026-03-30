import Link from "next/link";

interface DealCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
  imageUrl: string;
  createdAt: string;
}

export default function DealCard({
  slug,
  title,
  description,
  store,
  originalPrice,
  salePrice,
  discountPercent,
  category,
  imageUrl,
  createdAt,
}: DealCardProps) {
  const timeAgo = getTimeAgo(new Date(createdAt));
  const savings = originalPrice - salePrice;
  const isHotDeal = discountPercent >= 40;
  const isNewDeal = Date.now() - new Date(createdAt).getTime() < 3 * 60 * 60 * 1000; // 3 hours

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-brand-200 hover:-translate-y-1">
      <div className="flex flex-1 flex-col p-5">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isHotDeal && (
            <span className="animate-bounce-subtle inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
              🔥 HOT
            </span>
          )}
          {isNewDeal && (
            <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
              ✨ NEW
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        </div>

        {/* Category pill + store */}
        <div className="mt-3 flex items-center justify-between">
          <Link
            href={`/category/${category.toLowerCase()}`}
            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            {category}
          </Link>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h6a.75.75 0 01.75.75V21m-6 0H9m4.5 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 6.75h.375a1.125 1.125 0 001.125-1.125v-1.875m-17.25 3.375V6.75a1.125 1.125 0 011.125-1.125h12.75a1.125 1.125 0 011.125 1.125v12" />
            </svg>
            {store}
          </span>
        </div>

        {/* Title */}
        <Link href={`/deals/${slug}`} className="group/title mt-2">
          <h3 className="line-clamp-2 text-base font-bold text-gray-900 leading-snug transition group-hover/title:text-brand-700">
            {title}
          </h3>
        </Link>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 text-sm text-gray-500">{description}</p>

        {/* Time posted */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{timeAgo}</span>
          {isHotDeal && (
            <>
              <span className="mx-1">·</span>
              <span className="text-red-500 font-medium">Selling fast</span>
            </>
          )}
        </div>

        {/* Price row */}
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              ${salePrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400 line-through">
              ${originalPrice.toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-semibold text-green-600">
            You save ${savings.toFixed(2)}
          </p>
        </div>

        {/* CTA button — routes through redirect system */}
        <Link
          href={`/go/${slug}`}
          className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all duration-200 ${
            isHotDeal
              ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
              : "bg-brand-700 hover:bg-brand-800 shadow-lg shadow-brand-700/25"
          } hover:scale-[1.02] active:scale-[0.98]`}
        >
          {isHotDeal ? "🔥 Grab This Deal" : "View Deal"}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

/** Simple relative-time formatter */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}