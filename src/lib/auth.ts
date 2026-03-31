import { NextRequest } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "./db";

/**
 * Auth result returned by the authentication check.
 * - authorized: whether the request is allowed
 * - isMaster: true if authenticated via ADMIN_TOKEN (full access including key management)
 * - keyId: set if authenticated via an API key (deal CRUD + refresh only)
 */
export interface AuthResult {
  authorized: boolean;
  isMaster: boolean;
  keyId?: string;
}

/**
 * Authenticate an incoming request against either:
 * 1. The ADMIN_TOKEN env var (master admin — full access)
 * 2. An active API key stored in the `api_keys` Supabase table
 *
 * If an API key is used, its `lastUsedAt` timestamp is updated automatically.
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { authorized: false, isMaster: false };
  }

  // Check 1: ADMIN_TOKEN (master admin) — timing-safe comparison
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && adminToken.length === token.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(adminToken))) {
        return { authorized: true, isMaster: true };
      }
    } catch {
      // lengths differ or invalid input — fall through
    }
  }

  // Check 2: API key in database
  const { data: apiKey, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, active")
    .eq("key", token)
    .eq("active", true)
    .single();

  if (error || !apiKey) {
    return { authorized: false, isMaster: false };
  }

  // Update lastUsedAt in the background (don't await to avoid blocking)
  supabaseAdmin
    .from("api_keys")
    .update({ lastUsedAt: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {}); // fire-and-forget

  return { authorized: true, isMaster: false, keyId: apiKey.id };
}

/**
 * Convenience: check if request is authorized at all (admin token OR API key).
 * Used for deal CRUD and refresh endpoints.
 */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  const result = await authenticate(req);
  return result.authorized;
}

/**
 * Convenience: check if request is from master admin (ADMIN_TOKEN only).
 * Used for API key management endpoints — API keys cannot manage other keys.
 */
export async function isMasterAdmin(req: NextRequest): Promise<boolean> {
  const result = await authenticate(req);
  return result.authorized && result.isMaster;
}