import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/**
 * GET /api/admin/deals/[id] — Get a single deal by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const { id } = await params;

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) {
    return NextResponse.json(
      { success: false, error: `Deal with id "${id}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: deal });
}

/**
 * PUT /api/admin/deals/[id] — Update a deal.
 *
 * Body (all optional — only included fields are updated):
 *   - title, description, store, originalPrice, salePrice,
 *     category, imageUrl, finalUrl, active, slug
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Verify deal exists
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: `Deal with id "${id}" not found.` },
      { status: 404 }
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

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.description !== undefined) data.description = String(body.description);
  if (body.store !== undefined) data.store = String(body.store);
  if (body.originalPrice !== undefined) data.originalPrice = Number(body.originalPrice);
  if (body.salePrice !== undefined) data.salePrice = Number(body.salePrice);
  if (body.category !== undefined) {
    const validCategories = ["Tech", "Home", "Fashion", "Toys", "Misc"];
    if (!validCategories.includes(String(body.category))) {
      return NextResponse.json(
        { success: false, error: `Invalid category "${body.category}". Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }
    data.category = String(body.category);
  }
  if (body.imageUrl !== undefined) data.imageUrl = String(body.imageUrl);
  if (body.finalUrl !== undefined) {
    try {
      new URL(String(body.finalUrl));
    } catch {
      return NextResponse.json(
        { success: false, error: `Invalid finalUrl: "${body.finalUrl}". Must be a valid HTTP(S) URL.` },
        { status: 400 }
      );
    }
    data.finalUrl = String(body.finalUrl);
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.slug !== undefined) data.slug = String(body.slug);

  // Recalculate discount if prices changed
  const orig = Number(data.originalPrice ?? existing.originalPrice);
  const sale = Number(data.salePrice ?? existing.salePrice);
  if (sale > orig) {
    return NextResponse.json(
      { success: false, error: `salePrice ($${sale}) cannot be greater than originalPrice ($${orig}).` },
      { status: 400 }
    );
  }
  data.discountPercent = Math.round((1 - sale / orig) * 100);

  const deal = await prisma.deal.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    success: true,
    data: deal,
    message: `Deal "${deal.title}" updated successfully.`,
  });
}

/**
 * DELETE /api/admin/deals/[id] — Permanently delete a deal.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Verify deal exists
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: `Deal with id "${id}" not found.` },
      { status: 404 }
    );
  }

  await prisma.deal.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: `Deal "${existing.title}" deleted permanently.`,
  });
}