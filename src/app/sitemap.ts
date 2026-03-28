import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dealpilot.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/disclosure`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Category pages
  const categories = ["tech", "home", "fashion", "toys", "misc"];
  const categoryPages: MetadataRoute.Sitemap = categories.map((slug) => ({
    url: `${SITE_URL}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Deal pages
  const deals = await prisma.deal.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });
  const dealPages: MetadataRoute.Sitemap = deals.map((deal) => ({
    url: `${SITE_URL}/deals/${deal.slug}`,
    lastModified: deal.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...dealPages];
}