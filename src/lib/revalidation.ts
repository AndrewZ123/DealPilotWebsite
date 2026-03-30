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

import { revalidatePath, revalidateTag } from "next/cache";
import { CATEGORIES } from "@/lib/categories";

/**
 * Revalidate every public page that displays deals.
 *
 * Call this after ANY write to the deals table (create, update, delete).
 * Uses both path-based and tag-based revalidation for maximum reliability.
 */
export function revalidateAllDeals() {
  // Tag-based revalidation — purges ALL pages that fetch deals
  revalidateTag("deals");

  // Homepage — full page revalidation (not just layout)
  revalidatePath("/");

  // All category pages
  for (const cat of CATEGORIES) {
    revalidatePath(`/category/${cat.slug}`);
  }

  // All deal detail pages (wildcard)
  revalidatePath("/deals/[slug]", "page");

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
  // Tag-based revalidation for maximum reliability
  revalidateTag("deals");

  // Full homepage revalidation
  revalidatePath("/");

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
  // Tag-based revalidation for maximum reliability
  revalidateTag("deals");

  revalidateDealCategory(category);

  // The deal's own detail page
  revalidatePath(`/deals/${slug}`);
}
