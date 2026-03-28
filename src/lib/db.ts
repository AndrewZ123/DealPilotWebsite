/**
 * Supabase client singletons for DealPilot.
 *
 * Two clients are exported:
 *  - `supabase`       — public client (anon key), respects Row Level Security.
 *                        Used for public-facing reads (listing active deals, etc.).
 *
 *  - `supabaseAdmin`  — service-role client, bypasses RLS entirely.
 *                        Used for admin operations, writes, click logging,
 *                        and anything that needs unrestricted access.
 *
 * IMPORTANT: Never expose `supabaseAdmin` to the client-side bundle.
 * Only import it in server-side code (API routes, server components, etc.).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ── Public client (respects RLS) ──────────────────────────────
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

export const supabase =
  globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase;
}

// ── Admin client (bypasses RLS — server-side only!) ──────────
const globalForAdmin = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

if (!supabaseServiceKey && typeof window === "undefined") {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail. " +
    "Add it to your .env or Vercel environment variables."
  );
}

export const supabaseAdmin =
  globalForAdmin.supabaseAdmin ??
  (supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase); // fallback to public client if no service key (will fail on admin ops due to RLS)

if (process.env.NODE_ENV !== "production") {
  globalForAdmin.supabaseAdmin = supabaseAdmin;
}