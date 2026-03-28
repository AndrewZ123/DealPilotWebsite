import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import slugify from "slugify";

/**
 * Simple token-based admin auth check.
 * Expects Authorization: Bearer <ADMIN_TOKEN>
 */
function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/**
 * GET /api/admin/deals — List all deals with optional filtering.
 *
 * Query params:
 *   - category: filter by category (e.g. "tech", "home")
 *   - active: filter by active status ("true" or "false")
 *   - limit: max results (default 50, max 200)
 *   - offset: skip N results (default 0)
 *   - search: search title/description (case-insensitive)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const active = url.searchParams.get("active");
  const search = url.searchParams.get("search");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (active !== null) where.active = active === "true";
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { store: { contains: search } },
    ];
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.deal.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: deals,
    meta: { total, limit, offset, count: deals.length },
  });
}

/**
 * POST /api/admin/deals — Create a new deal.
 *
 * Body:
 *   - title (required): deal title
 *   - store (required): merchant/store name
 *   - originalPrice (required): original price (number)
 *   - salePrice (required): sale/discounted price (number)
 *   - finalUrl (required): target URL to redirect to
 *   - category (required): one of Tech, Home, Fashion, Toys, Misc
 *   - description (optional): deal description
 *   - imageUrl (optional): product image URL
 *   - active (optional): defaults to true
 *   - slug (optional): auto-generated from title if not provided
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { title, description, store, originalPrice, salePrice, category, imageUrl, finalUrl, active, slug: customSlug } = body;

  // Validate required fields
  const missing: string[] = [];
  if (!title) missing.push("title");
  if (!store) missing.push("store");
  if (!originalPrice) missing.push("originalPrice");
  if (!salePrice) missing.push("salePrice");
  if (!finalUrl) missing.push("finalUrl");
  if (!category) missing.push("category");

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate types
  const orig = Number(originalPrice);
  const sale = Number(salePrice);
  if (isNaN(orig) || isNaN(sale)) {
    return NextResponse.json(
      { success: false, error: "originalPrice and salePrice must be valid numbers." },
      { status: 400 }
    );
  }
  if (sale > orig) {
    return NextResponse.json(
      { success: false, error: `salePrice ($${sale}) cannot be greater than originalPrice ($${orig}).` },
      { status: 400 }
    );
  }

  // Validate category
  const validCategories = ["Tech", "Home", "Fashion", "Toys", "Misc"];
  if (!validCategories.includes(String(category))) {
    return NextResponse.json(
      { success: false, error: `Invalid category "${category}". Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate URL
  try {
    new URL(String(finalUrl));
  } catch {
    return NextResponse.json(
      { success: false, error: `Invalid finalUrl: "${finalUrl}". Must be a valid HTTP(S) URL.` },
      { status: 400 }
    );
  }

  const discountPercent = Math.round((1 - sale / orig) * 100);

  // Generate unique slug
  let slug = customSlug
    ? slugify(String(customSlug), { lower: true, strict: true })
    : slugify(String(title), { lower: true, strict: true });

  let existing = await prisma.deal.findUnique({ where: { slug } });
  while (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    existing = await prisma.deal.findUnique({ where: { slug } });
  }

  const deal = await prisma.deal.create({
    data: {
      slug,
      title: String(title),
      description: String(description || ""),
      store: String(store),
      originalPrice: orig,
      salePrice: sale,
      discountPercent,
      category: String(category),
      imageUrl: imageUrl ? String(imageUrl) : "",
      finalUrl: String(finalUrl),
      active: active !== undefined ? Boolean(active) : true,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: deal,
      message: `Deal "${deal.title}" created with slug "${deal.slug}".`,
    },
    { status: 201 }
  );
}