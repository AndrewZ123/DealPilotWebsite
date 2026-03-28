import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
 * PUT /api/admin/keys/[id] — Update an API key.
 *
 * Body (partial):
 *   name: string (optional)
 *   active: boolean (optional — toggle active/inactive)
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

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: `API key with id "${id}" not found.` },
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

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = (body.name as string).trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name cannot be empty." },
        { status: 400 }
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be 100 characters or less." },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.active !== undefined) {
    updates.active = Boolean(body.active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid fields to update. Send 'name' and/or 'active'." },
      { status: 400 }
    );
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      prefix: updated.prefix,
      active: updated.active,
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
    message: `API key "${updated.name}" updated successfully.`,
  });
}

/**
 * DELETE /api/admin/keys/[id] — Permanently delete an API key.
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

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: `API key with id "${id}" not found.` },
      { status: 404 }
    );
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: `API key "${existing.name}" (${existing.prefix}...) deleted permanently.`,
  });
}

/**
 * POST /api/admin/keys/[id] — Regenerate an API key.
 *
 * Generates a new key value for this key record. The old key immediately stops working.
 * Returns the new full key — it won't be shown again.
 */
export async function POST(
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

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: `API key with id "${id}" not found.` },
      { status: 404 }
    );
  }

  const { key, prefix } = generateApiKey();

  const updated = await prisma.apiKey.update({
    where: { id },
    data: { key, prefix },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      prefix: updated.prefix,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      // ⚠️ Full new key — show to the user NOW. Cannot be retrieved again.
      key,
    },
    message: `API key "${updated.name}" regenerated. Save the new key now — it won't be shown again.`,
  });
}