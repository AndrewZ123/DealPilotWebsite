import DealCard from "./DealCard";

interface DealGridProps {
  deals: Array<{
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
  }>;
  emptyMessage?: string;
}

export default function DealGrid({ deals, emptyMessage = "No deals found. Check back soon!" }: DealGridProps) {
  if (deals.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {deals.map((deal) => (
        <DealCard key={deal.id} {...deal} />
      ))}
    </div>
  );
}