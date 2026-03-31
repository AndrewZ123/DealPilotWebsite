/**
 * Auto-Import Pipeline Endpoint
 *
 * POST /api/auto-import
 *
 * Orchestrates: RSS fetch → dedup → LLM rewrite (parallel batches) → insert
 * Protected by ADMIN_TOKEN or API key (same auth as other admin routes).
 *
 * Called by GitHub Actions cron every 10 minutes.
 * Processes deals in concurrent batches to maximise throughput within
 * serverless function time limits.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { RSS_SOURCES } from "@/lib/rss-sources";
import { fetchRSSFeed } from "@/lib/rss-parser";
import { rewriteDeal } from "@/lib/llm-rewrite";
import { revalidateAllDeals } from "@/lib/revalidation";
import { VALID_CATEGORIES, sanitiseSearch } from "@/lib/utils";

// Allow up to 60 s on Vercel Pro (Hobby tier caps at 10 s regardless)
export const maxDuration = 60;

// Track whether sourceUrl column exists (avoid repeated failed queries)
let sourceUrlColumnExists = true;

/** Max deals to process per single API call (avoid timeouts) */
const MAX_DEALS_PER_RUN = 4;

/** How many LLM calls to fire in parallel — keep at 1 to avoid rate limits */
const CONCURRENCY = 1;

// ── Helpers ──────────────────────────────────────────────────────────────

interface PendingDeal {
  raw: Awaited<ReturnType<typeof fetchRSSFeed>>["deals"][number];
  sourceName: string;
}

/** Check whether a raw RSS item is already in the database. */
async function isDuplicate(
  raw: PendingDeal["raw"]
): Promise<boolean> {
  if (sourceUrlColumnExists) {
    try {
      const { data, error } = await supabaseAdmin
        .from("deals")
        .select("id")
        .eq("sourceUrl", raw.link)
        .maybeSingle();

      if (error?.message?.includes("does not exist")) {
        sourceUrlColumnExists = false;
      } else if (data) {
        return true;
      }
    } catch {
      sourceUrlColumnExists = false;
    }
  }

  // Fallback: title-based dedup
  if (!sourceUrlColumnExists) {
    const normalizedTitle = raw.title.toLowerCase().trim().slice(0, 100);
    const { data } = await supabaseAdmin
      .from("deals")
      .select("id")
      .ilike("title", `${normalizedTitle}%`)
      .limit(1)
      .maybeSingle();
    if (data) return true;
  }

  return false;
}

/** Validate + normalise a drafted deal; return null if invalid. */
function validateDraft(
  deal: Record<string, unknown>
): { valid: boolean; reason?: string } {
  const orig = Number(deal.originalPrice) || 0;
  const sale = Number(deal.salePrice) || 0;

  if (!orig || !sale || orig <= 0 || sale <= 0) {
    return { valid: false, reason: `No valid prices (original=$${orig}, sale=$${sale})` };
  }

  const catMap: Record<string, string> = {
    Electronics: "Tech", Audio: "Tech", Computers: "Tech", Phones: "Tech",
    TV: "Tech", Gaming: "Toys", Kitchen: "Home", Outdoor: "Home",
    Beauty: "Fashion", Fitness: "Home", Food: "Home", Travel: "Misc",
  };
  if (!VALID_CATEGORIES.includes(String(deal.category))) {
    deal.category = catMap[String(deal.category)] || "Misc";
  }

  deal.discountPercent = Math.round(((orig - sale) / orig) * 100);

  return { valid: true };
}

/** Insert a deal into Supabase. Returns true on success. */
async function insertDeal(
  deal: Record<string, unknown>,
  raw: PendingDeal["raw"],
  logs: string[]
): Promise<boolean> {
  const slugBase = String(deal.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const slugSuffix =
    Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5);
  const slug = `${slugBase}-${slugSuffix}`;

  const insertData: Record<string, unknown> = {
    slug,
    title: deal.title,
    description: deal.description,
    store: deal.store,
    originalPrice: deal.originalPrice,
    salePrice: deal.salePrice,
    discountPercent: deal.discountPercent,
    category: deal.category,
    imageUrl: "",
    finalUrl: deal.directUrl,
    active: true,
  };

  if (sourceUrlColumnExists) insertData.sourceUrl = raw.link;

  const { error: insertError } = await supabaseAdmin
    .from("deals")
    .insert(insertData);

  if (insertError) {
    if (
      insertError.message?.includes("sourceUrl") &&
      insertError.message?.includes("does not exist")
    ) {
      sourceUrlColumnExists = false;
      delete insertData.sourceUrl;
      const { error: retryError } = await supabaseAdmin
        .from("deals")
        .insert(insertData);
      if (retryError) {
        logs.push(`  ❌ Insert failed for "${String(deal.title).slice(0, 50)}": ${retryError.message}`);
        return false;
      }
    } else {
      logs.push(`  ❌ Insert failed for "${String(deal.title).slice(0, 50)}": ${insertError.message}`);
      return false;
    }
  }
  return true;
}

// ── Main handler ─────────────────────────────────────────────────────────

/**
 * Verify the request is either:
 * 1. Authenticated via ADMIN_TOKEN / API key (manual trigger or GitHub Actions)
 * 2. A legitimate Vercel Cron invocation (x-vercel-cron header present)
 */
async function isCronOrAuthorized(req: NextRequest): Promise<boolean> {
  // Check 1: Token via query parameter (e.g., /api/auto-import?token=xxx)
  // Allows simple HTTP GET pings from external cron services like cron-job.org
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken && queryToken === adminToken) {
      return true;
    }
  }

  // Check 2: Vercel Cron (includes x-vercel-cron header automatically)
  const isVercelCron = req.headers.get("x-vercel-cron") === "true";
  if (isVercelCron) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      return token === cronSecret;
    }
    return true;
  }

  // Check 3: Standard admin auth (Bearer token in Authorization header)
  return isAuthorized(req);
}

/** GET handler — invoked by Vercel Cron (vercel.json crons config) */
export async function GET(req: NextRequest) {
  const authorized = await isCronOrAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runImport(req);
}

/** POST handler — invoked manually or by GitHub Actions */
export async function POST(req: NextRequest) {
  const authorized = await isCronOrAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runImport(req);
}

/** Shared import logic — auth is handled by the callers above */
async function runImport(_req: NextRequest): Promise<NextResponse> {

  // ── Concurrency guard (Supabase distributed lock) ──
  // Uses pg_try_advisory_lock via RPC so it works across serverless instances.
  const { data: locked } = await supabaseAdmin.rpc("try_auto_import_lock");
  if (!locked) {
    return NextResponse.json({
      success: true,
      imported: 0,
      skipped: 0,
      failed: 0,
      logs: ["⏭️ Skipped — another import is already in progress"],
    });
  }

  try {

  const logs: string[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // ── Phase 1: Fetch all RSS feeds in parallel ──
  logs.push("📡 Fetching RSS feeds in parallel...");
  const feedResults = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const result = await fetchRSSFeed(source);
      return { source, ...result };
    })
  );

  // ── Phase 2: Collect & deduplicate all items ──
  const pending: PendingDeal[] = [];

  for (const result of feedResults) {
    if (result.status === "rejected") {
      logs.push(`⚠️ Feed fetch failed: ${result.reason}`);
      continue;
    }
    const { source, deals: rawDeals, errors: fetchErrors } = result.value;
    if (fetchErrors.length > 0) {
      logs.push(...fetchErrors.map((e) => `  ⚠️ ${e}`));
    }
    logs.push(`📰 ${source.name}: ${rawDeals.length} items`);
    for (const raw of rawDeals) {
      pending.push({ raw, sourceName: source.name });
    }
  }

  logs.push(`\n🔍 Deduplicating ${pending.length} items...`);

  // Dedup all at once (parallel)
  const dedupResults = await Promise.all(
    pending.map(async (p) => ({
      pending: p,
      isDup: await isDuplicate(p.raw),
    }))
  );

  const newDeals = dedupResults.filter((r) => !r.isDup).map((r) => r.pending);
  skipped = dedupResults.filter((r) => r.isDup).length;

  logs.push(`  ${skipped} duplicates, ${newDeals.length} new candidates`);

  // Cap at MAX_DEALS_PER_RUN
  const toProcess = newDeals.slice(0, MAX_DEALS_PER_RUN);
  if (newDeals.length > MAX_DEALS_PER_RUN) {
    logs.push(`  ⚡ Processing first ${MAX_DEALS_PER_RUN} (out of ${newDeals.length}) to fit time budget`);
  }

  // ── Phase 3: LLM rewrite in parallel batches ──
  logs.push(`\n🤖 Processing ${toProcess.length} deals (concurrency=${CONCURRENCY})...`);

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const { deal, error } = await rewriteDeal(item.raw);
        return { item, deal, error };
      })
    );

    for (const res of results) {
      if (res.status === "rejected") {
        failed++;
        logs.push(`  ❌ LLM call failed: ${res.reason}`);
        continue;
      }

      const { item, deal, error } = res.value;

      if (!deal || error) {
        failed++;
        logs.push(`  ❌ "${item.raw.title.slice(0, 50)}": ${error ?? "Unknown"}`);
        continue;
      }

      const validation = validateDraft(deal as unknown as Record<string, unknown>);
      if (!validation.valid) {
        failed++;
        logs.push(`  ❌ "${item.raw.title.slice(0, 50)}": ${validation.reason}`);
        continue;
      }

      const ok = await insertDeal(
        deal as unknown as Record<string, unknown>,
        item.raw,
        logs
      );
      if (ok) {
        imported++;
        logs.push(`  ✅ Imported: ${deal.title.slice(0, 60)} → ${deal.store}`);
      } else {
        failed++;
      }
    }
  }

  // ── Phase 4: Revalidate public pages so new deals appear immediately ──
  if (imported > 0) {
    try {
      revalidateAllDeals();
      logs.push(`🔄 Cache purged for public pages`);
    } catch {
      logs.push(`⚠️ Cache revalidation failed (deals are saved though)`);
    }
  }

  logs.push(
    `\n🏁 Done: ${imported} imported, ${skipped} duplicates skipped, ${failed} failed`
  );

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    failed,
    logs,
  });

  } finally {
    // Always release the distributed lock, even if an error occurred
    await supabaseAdmin.rpc("release_auto_import_lock");
  }
}
