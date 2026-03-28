import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/**
 * GET /api/admin/stats — Dashboard statistics.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  // Run queries in parallel
  const [
    totalRes,
    activeRes,
    inactiveRes,
    recentRes,
    topClicksRes,
  ] = await Promise.all([
    supabaseAdmin.from("deals").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("deals").select("id", { count: "exact", head: true }).eq("active", true),
    supabaseAdmin.from("deals").select("id", { count: "exact", head: true }).eq("active", false),
    supabaseAdmin.from("deals").select("id, title, store, createdAt").eq("active", true).order("createdAt", { ascending: false }).limit(5),
    supabaseAdmin.from("deals").select("id, title, store, clicks").eq("active", true).order("clicks", { ascending: false }).limit(5),
  ]);

  // Get total clicks via aggregation (sum all clicks)
  const { data: allClicks } = await supabaseAdmin
    .from("deals")
    .select("clicks");

  const totalClicks = (allClicks ?? []).reduce((sum: number, d: { clicks: number }) => sum + (d.clicks || 0), 0);

  // Category breakdown
  const { data: catData } = await supabaseAdmin
    .from("deals")
    .select("category");

  const categoryMap: Record<string, number> = {};
  for (const c of catData ?? []) {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
  }
  const categories = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    success: true,
    data: {
      deals: {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        inactive: inactiveRes.count ?? 0,
      },
      clicks: { total: totalClicks },
      categories,
      recentDeals: recentRes.data ?? [],
      topDealsByClicks: topClicksRes.data ?? [],
    },
  });
}