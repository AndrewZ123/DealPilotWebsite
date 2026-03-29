/**
 * Cache revalidation utilities for DealPilot.
 *
 * When admin mutations (create / update / delete) modify the `deals` table,
 * the public-facing Next.js pages that render those deals must be revalidated
 * so visitors always see the latest data.
 *
 * Next.js App Router caches server-component output aggressively.
 * Calling `revalidatePath` purges the cached HTML/JSON for a given path so
 * the next request fetches fresh data from Supabase.
 */

import { revalidatePath } from "next/cache";
import { CATEGORIES } from "@/lib/categories";

/**
 * Revalidate every public page that displays deals.
 *
 * Call this after ANY write to the deals table (create, update, delete).
 */
export function revalidateAllDeals() {
  // Homepage (deal grid + stats)
  revalidatePath("/", "layout");

  // All category pages
  for (const cat of CATEGORIES) {
    revalidatePath(`/category/${cat.slug}`);
  }

  // Sitemap (includes deal URLs)
  revalidatePath("/sitemap.xml");
}

/**
 * Revalidate pages relevant to a single deal's category.
 *
 * Call this after a create or update where you know the deal's category
 * but don't need to sweep every page.
 */
export function revalidateDealCategory(category: string) {
  revalidatePath("/", "layout");

  const slug = category.toLowerCase();
  revalidatePath(`/category/${slug}`);

  revalidatePath("/sitemap.xml");
}

/**
 * Revalidate pages relevant to a single deal (by slug).
 *
 * Call this when a specific deal is updated or deleted so its detail page
 * and its category page are refreshed.
 */
export function revalidateDeal(slug: string, category: string) {
  revalidateDealCategory(category);

  // The deal's own detail page
  revalidatePath(`/deals/${slug}`);
}