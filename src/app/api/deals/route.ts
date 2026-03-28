import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

const PAGE_SIZE = 18;

/**
 * GET /api/deals — public listing of active deals.
 * Uses the public Supabase client (respects RLS: only active deals visible).
 *
 * Query params:
 *   page     — page number (default 1)
 *   category — filter by category slug (e.g. "tech")
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const category = searchParams.get("category") || undefined;

  // Build query — public client + RLS ensures only active deals are returned
  let query = supabase
    .from("deals")
    .select("id, slug, title, description, store, originalPrice, salePrice, discountPercent, category, imageUrl, clicks, createdAt, updatedAt", { count: "exact" })
    .eq("active", true)
    .order("createdAt", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: deals, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deals: deals ?? [],
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    total: count ?? 0,
  });
}