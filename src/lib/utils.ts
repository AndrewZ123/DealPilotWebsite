/**
 * Shared utility functions for DealPilot.
 *
 * Centralises helpers that are used across multiple routes to avoid
 * duplication and ensure consistency.
 */

import crypto from "crypto";
import { CATEGORIES } from "./categories";

// ── API Key Generation ──────────────────────────────────────────────────

/** Generate a random API key with a readable prefix. */
export function generateApiKey(): { key: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const key = `dp_${random}`;
  const prefix = key.slice(0, 8);
  return { key, prefix };
}

// ── Category Validation ─────────────────────────────────────────────────

/** Set of valid category names sourced from the canonical CATEGORIES list. */
export const VALID_CATEGORIES = CATEGORIES.map((c) => c.name);

/** Check whether a category name is valid. */
export function isValidCategory(category: string): boolean {
  return VALID_CATEGORIES.includes(category);
}

// ── Input Sanitisation ──────────────────────────────────────────────────

/**
 * Sanitise a search string for safe use in Supabase queries.
 * Strips characters that could be used for injection or abuse.
 */
export function sanitiseSearch(input: string): string {
  return input
    .replace(/[%_\\]/g, "")   // remove LIKE wildcards and escapes
    .replace(/[;'"`]/g, "")   // remove SQL injection chars
    .replace(/</g, "")         // remove HTML
    .replace(/>/g, "")
    .trim()
    .slice(0, 200);           // reasonable length cap
}