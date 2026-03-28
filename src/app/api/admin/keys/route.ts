import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import crypto from "crypto";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

function generateApiKey(): { key: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const key = `dp_${random}`;
  const prefix = key.slice(0, 8);
  return { key, prefix };
}

/**
 * GET /api/admin/keys — List all API keys (key values are masked).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: keys, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, prefix, active, lastUsedAt, createdAt, updatedAt")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: keys });
}

/**
 * POST /api/admin/keys — Create a new API key.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name as string || "").trim();
  if (!name) {
    return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ success: false, error: "Name must be 100 characters or less." }, { status: 400 });
  }

  const { key, prefix } = generateApiKey();

  const { data: apiKey, error } = await supabaseAdmin
    .from("api_keys")
    .insert({ name, key, prefix })
    .select("id, name, prefix, active, createdAt")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      data: { ...apiKey, key },
      message: `API key "${name}" created. Save the key now — it won't be shown again.`,
    },
    { status: 201 }
  );
}