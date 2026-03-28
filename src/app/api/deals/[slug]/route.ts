import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

/**
 * GET /api/deals/[slug] — public single-deal detail.
 * Uses public client (RLS ensures only active deals visible).
 * Returns everything except finalUrl.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, slug, title, description, store, originalPrice, salePrice, discountPercent, category, imageUrl, clicks, createdAt, updatedAt")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json(deal);
}