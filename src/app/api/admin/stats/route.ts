import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/**
 * GET /api/admin/stats — Get dashboard statistics.
 *
 * Returns counts of deals, active/inactive, total clicks,
 * category breakdown, and recent activity.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const [
    totalDeals,
    activeDeals,
    inactiveDeals,
    totalClicks,
    categoryBreakdown,
    recentDeals,
    topDealsByClicks,
  ] = await Promise.all([
    prisma.deal.count(),
    prisma.deal.count({ where: { active: true } }),
    prisma.deal.count({ where: { active: false } }),
    prisma.deal.aggregate({ _sum: { clicks: true } }),
    prisma.deal.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.deal.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, store: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { active: true },
      orderBy: { clicks: "desc" },
      take: 5,
      select: { id: true, title: true, store: true, clicks: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      deals: {
        total: totalDeals,
        active: activeDeals,
        inactive: inactiveDeals,
      },
      clicks: {
        total: totalClicks._sum.clicks || 0,
      },
      categories: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      recentDeals,
      topDealsByClicks,
    },
  });
}