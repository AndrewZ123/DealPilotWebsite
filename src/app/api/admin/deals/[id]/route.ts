import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

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
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  const { data: deal, error } = await supabaseAdmin
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !deal) {
    return NextResponse.json(
      { success: false, error: `Deal with id "${id}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: deal });
}

/**
 * PUT /api/admin/deals/[id] — Update a deal.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  // Verify deal exists
  const { data: existing } = await supabaseAdmin
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

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
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
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
        { success: false, error: `Invalid category "${body.category}".` },
        { status: 400 }
      );
    }
    data.category = String(body.category);
  }
  if (body.imageUrl !== undefined) data.imageUrl = String(body.imageUrl);
  if (body.finalUrl !== undefined) {
    try { new URL(String(body.finalUrl)); } catch {
      return NextResponse.json(
        { success: false, error: `Invalid finalUrl: "${body.finalUrl}".` },
        { status: 400 }
      );
    }
    data.finalUrl = String(body.finalUrl);
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.slug !== undefined) data.slug = String(body.slug);

  // Recalculate discount
  const orig = Number(data.originalPrice ?? existing.originalPrice);
  const sale = Number(data.salePrice ?? existing.salePrice);
  if (sale > orig) {
    return NextResponse.json(
      { success: false, error: `salePrice ($${sale}) cannot exceed originalPrice ($${orig}).` },
      { status: 400 }
    );
  }
  data.discountPercent = Math.round((1 - sale / orig) * 100);

  const { data: deal, error } = await supabaseAdmin
    .from("deals")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

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
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("deals")
    .select("title")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { success: false, error: `Deal with id "${id}" not found.` },
      { status: 404 }
    );
  }

  const { error } = await supabaseAdmin.from("deals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Deal "${existing.title}" deleted permanently.`,
  });
}