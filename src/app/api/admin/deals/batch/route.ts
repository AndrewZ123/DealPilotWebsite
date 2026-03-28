import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import slugify from "slugify";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

const VALID_CATEGORIES = ["Tech", "Home", "Fashion", "Toys", "Misc"];

/**
 * POST /api/admin/deals/batch — Create multiple deals at once.
 *
 * Body:
 *   {
 *     "deals": [
 *       {
 *         "title": "...",          (required)
 *         "store": "...",           (required)
 *         "originalPrice": 99.99,   (required)
 *         "salePrice": 49.99,       (required)
 *         "finalUrl": "https://...", (required)
 *         "category": "Tech",       (required)
 *         "description": "...",     (optional)
 *         "imageUrl": "https://...", (optional)
 *         "active": true            (optional, defaults to true)
 *       },
 *       ...
 *     ]
 *   }
 *
 * Returns:
 *   { success: true, data: [...created deals], errors: [...any failed items] }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  let body: { deals?: Record<string, unknown>[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.deals || !Array.isArray(body.deals)) {
    return NextResponse.json(
      { success: false, error: "Request body must contain a 'deals' array." },
      { status: 400 }
    );
  }

  if (body.deals.length === 0) {
    return NextResponse.json(
      { success: false, error: "'deals' array must not be empty." },
      { status: 400 }
    );
  }

  if (body.deals.length > 100) {
    return NextResponse.json(
      { success: false, error: "Batch limit is 100 deals per request." },
      { status: 400 }
    );
  }

  const created = [];
  const errors: { index: number; error: string; deal: Record<string, unknown> }[] = [];

  for (let i = 0; i < body.deals.length; i++) {
    const d = body.deals[i];

    try {
      // Validate required fields
      const missing: string[] = [];
      if (!d.title) missing.push("title");
      if (!d.store) missing.push("store");
      if (!d.originalPrice) missing.push("originalPrice");
      if (!d.salePrice) missing.push("salePrice");
      if (!d.finalUrl) missing.push("finalUrl");
      if (!d.category) missing.push("category");

      if (missing.length > 0) {
        errors.push({ index: i, error: `Missing required fields: ${missing.join(", ")}`, deal: d });
        continue;
      }

      const orig = Number(d.originalPrice);
      const sale = Number(d.salePrice);

      if (isNaN(orig) || isNaN(sale)) {
        errors.push({ index: i, error: "originalPrice and salePrice must be valid numbers.", deal: d });
        continue;
      }

      if (sale > orig) {
        errors.push({ index: i, error: `salePrice ($${sale}) cannot exceed originalPrice ($${orig}).`, deal: d });
        continue;
      }

      if (!VALID_CATEGORIES.includes(String(d.category))) {
        errors.push({ index: i, error: `Invalid category "${d.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`, deal: d });
        continue;
      }

      try {
        new URL(String(d.finalUrl));
      } catch {
        errors.push({ index: i, error: `Invalid finalUrl: "${d.finalUrl}"`, deal: d });
        continue;
      }

      const discountPercent = Math.round((1 - sale / orig) * 100);

      // Generate unique slug
      let slug = slugify(String(d.title), { lower: true, strict: true });
      let existing = await prisma.deal.findUnique({ where: { slug } });
      while (existing) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        existing = await prisma.deal.findUnique({ where: { slug } });
      }

      const deal = await prisma.deal.create({
        data: {
          slug,
          title: String(d.title),
          description: String(d.description || ""),
          store: String(d.store),
          originalPrice: orig,
          salePrice: sale,
          discountPercent,
          category: String(d.category),
          imageUrl: d.imageUrl ? String(d.imageUrl) : "",
          finalUrl: String(d.finalUrl),
          active: d.active !== undefined ? Boolean(d.active) : true,
        },
      });

      created.push(deal);
    } catch (err) {
      errors.push({
        index: i,
        error: err instanceof Error ? err.message : "Unknown error",
        deal: d,
      });
    }
  }

  return NextResponse.json(
    {
      success: errors.length === 0,
      data: created,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${created.length} of ${body.deals.length} deals.${errors.length > 0 ? ` ${errors.length} failed.` : ""}`,
    },
    { status: errors.length === 0 ? 201 : 207 }
  );
}