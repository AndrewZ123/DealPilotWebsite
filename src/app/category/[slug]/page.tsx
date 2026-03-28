import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCategoryBySlug, CATEGORIES } from "@/lib/categories";
import DealGrid from "@/components/DealGrid";
import DisclosureBanner from "@/components/DisclosureBanner";
import { notFound } from "next/navigation";

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

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const deals = await prisma.deal.findMany({
    where: { active: true, category: cat.name },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      store: true,
      originalPrice: true,
      salePrice: true,
      discountPercent: true,
      category: true,
      imageUrl: true,
      createdAt: true,
    },
  });

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
        deals={deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
        emptyMessage={`No ${cat.name} deals right now — check back soon!`}
      />
    </div>
  );
}