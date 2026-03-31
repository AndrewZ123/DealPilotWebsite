import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { revalidateDeal } from "@/lib/revalidation";
import { VALID_CATEGORIES, sanitiseSearch } from "@/lib/utils";
import slugify from "slugify";

/**
 * GET /api/admin/deals — List all deals with optional filtering.
 * Uses admin client (bypasses RLS, sees all deals including inactive).
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
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

  let query = supabaseAdmin
    .from("deals")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (active !== null) query = query.eq("active", active === "true");
  if (search) {
    const safe = sanitiseSearch(search);
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,store.ilike.%${safe}%`);
  }

  const { data: deals, count, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: deals ?? [],
    meta: { total: count ?? 0, limit, offset, count: deals?.length ?? 0 },
  });
}

/**
 * POST /api/admin/deals — Create a new deal.
 * Uses admin client (bypasses RLS).
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
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

  if (!VALID_CATEGORIES.includes(String(category))) {
    return NextResponse.json(
      { success: false, error: `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

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

  // Ensure slug is unique
  let { data: existing } = await supabaseAdmin.from("deals").select("id").eq("slug", slug).single();
  while (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    ({ data: existing } = await supabaseAdmin.from("deals").select("id").eq("slug", slug).single());
  }

  const { data: deal, error } = await supabaseAdmin
    .from("deals")
    .insert({
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
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Purge cached pages so the new deal appears on the public site immediately
  revalidateDeal(deal.slug, deal.category);

  return NextResponse.json(
    {
      success: true,
      data: deal,
      message: `Deal "${deal.title}" created with slug "${deal.slug}".`,
    },
    { status: 201 }
  );
}