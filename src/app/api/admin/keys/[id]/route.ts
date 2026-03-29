import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { isMasterAdmin } from "@/lib/auth";
import crypto from "crypto";

function generateApiKey(): { key: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const key = `dp_${random}`;
  const prefix = key.slice(0, 8);
  return { key, prefix };
}

/**
 * PUT /api/admin/keys/[id] — Update an API key.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isMasterAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized. Master admin token required." }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin.from("api_keys").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ success: false, error: `API key "${id}" not found.` }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ success: false, error: "Name cannot be empty." }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ success: false, error: "Name too long." }, { status: 400 });
    updates.name = name;
  }
  if (body.active !== undefined) updates.active = Boolean(body.active);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields." }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("api_keys")
    .update(updates)
    .eq("id", id)
    .select("id, name, prefix, active, lastUsedAt, createdAt, updatedAt")
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: updated,
    message: `API key "${updated.name}" updated.`,
  });
}

/**
 * DELETE /api/admin/keys/[id] — Permanently delete an API key.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isMasterAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized. Master admin token required." }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin.from("api_keys").select("name, prefix").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ success: false, error: `API key "${id}" not found.` }, { status: 404 });
  }

  await supabaseAdmin.from("api_keys").delete().eq("id", id);

  return NextResponse.json({
    success: true,
    message: `API key "${existing.name}" (${existing.prefix}...) deleted.`,
  });
}

/**
 * POST /api/admin/keys/[id] — Regenerate an API key.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isMasterAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized. Master admin token required." }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin.from("api_keys").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ success: false, error: `API key "${id}" not found.` }, { status: 404 });
  }

  const { key, prefix } = generateApiKey();

  const { data: updated, error } = await supabaseAdmin
    .from("api_keys")
    .update({ key, prefix })
    .eq("id", id)
    .select("id, name, prefix, active, createdAt, updatedAt")
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: { ...updated, key },
    message: `API key "${updated.name}" regenerated. Save the new key now.`,
  });
}