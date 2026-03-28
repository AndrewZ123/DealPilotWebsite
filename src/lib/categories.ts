/** Canonical list of deal categories used across the site */

import type { Category } from "@/types";

export const CATEGORIES: Category[] = [
  { name: "Tech", slug: "tech", icon: "💻" },
  { name: "Home", slug: "home", icon: "🏠" },
  { name: "Fashion", slug: "fashion", icon: "👗" },
  { name: "Toys", slug: "toys", icon: "🎮" },
  { name: "Misc", slug: "misc", icon: "📦" },
];

/** Look up a category name by its slug */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}