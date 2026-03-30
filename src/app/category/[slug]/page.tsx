import { Metadata } from "next";
import { supabase } from "@/lib/db";
import { getCategoryBySlug, CATEGORIES } from "@/lib/categories";
import DealGrid from "@/components/DealGrid";
import DisclosureBanner from "@/components/DisclosureBanner";
import { notFound } from "next/navigation";

// Always render fresh — ensures deals appear instantly after admin changes
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return { title: "Category Not Found" };
  return {
    title: `${cat.name} Deals`,
    description: `Browse the latest ${cat.name.toLowerCase()} deals curated by DealPilot. Save big on ${cat.name.toLowerCase()} products from top retailers.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const { data: deals } = await supabase
    .from("deals")
    .select("id, slug, title, description, store, originalPrice, salePrice, discountPercent, category, imageUrl, createdAt")
    .eq("active", true)
    .eq("category", cat.name)
    .order("createdAt", { ascending: false })
    .limit(30);

  const dealList = deals ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {cat.name} Deals
      </h1>
      <p className="mt-2 text-gray-500">
        The best {cat.name.toLowerCase()} discounts we've found. Updated regularly.
      </p>

      <div className="mt-4 mb-6">
        <DisclosureBanner />
      </div>

      {/* Category pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <a
            key={c.slug}
            href={`/category/${c.slug}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              c.slug === slug
                ? "bg-brand-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <DealGrid
        deals={dealList.map((d) => ({ ...d, createdAt: new Date(d.createdAt).toISOString() }))}
        emptyMessage={`No ${cat.name} deals right now — check back soon!`}
      />
    </div>
  );
}