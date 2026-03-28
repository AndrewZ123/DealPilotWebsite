import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/**
 * Generate a secure random API key string.
 * Format: dp_<32 random hex chars> (total 35 chars)
 */
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
    return NextResponse.json(
      { success: false, error: "Unauthorized. Provide Authorization: Bearer <token> header." },
      { status: 401 }
    );
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      active: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: keys });
}

/**
 * POST /api/admin/keys — Create a new API key.
 *
 * Body:
 *   name: string (required, 1-100 chars)
 *
 * Returns the full key ONLY on creation — it cannot be retrieved again.
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

  const name = (body.name as string || "").trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Name is required." },
      { status: 400 }
    );
  }
  if (name.length > 100) {
    return NextResponse.json(
      { success: false, error: "Name must be 100 characters or less." },
      { status: 400 }
    );
  }

  const { key, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: { name, key, prefix },
  });

  // Return the full key this one time only
  return NextResponse.json(
    {
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        active: apiKey.active,
        createdAt: apiKey.createdAt,
        // ⚠️ Full key — show to the user NOW. Cannot be retrieved again.
        key,
      },
      message: `API key "${name}" created. Save the key now — it won't be shown again.`,
    },
    { status: 201 }
  );
}