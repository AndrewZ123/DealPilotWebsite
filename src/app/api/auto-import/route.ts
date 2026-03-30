/**
 * Auto-Import Pipeline Endpoint
 *
 * POST /api/auto-import
 *
 * Orchestrates: RSS fetch → LLM rewrite → dedup → insert into Supabase
 * Protected by ADMIN_TOKEN or API key (same auth as other admin routes).
 *
 * Called by GitHub Actions cron every 30 minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { RSS_SOURCES } from "@/lib/rss-sources";
import { fetchRSSFeed } from "@/lib/rss-parser";
import { rewriteDeal } from "@/lib/llm-rewrite";

export async function POST(req: NextRequest) {
  // ── Auth check ──
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs: string[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const source of RSS_SOURCES) {
    logs.push(`📰 Fetching ${source.name}...`);

    // ── Step 1: Fetch & parse RSS ──
    const { deals: rawDeals, errors: fetchErrors } = await fetchRSSFeed(source);
    if (fetchErrors.length > 0) {
      logs.push(...fetchErrors.map((e) => `  ⚠️ ${e}`));
    }
    if (rawDeals.length === 0) {
      logs.push(`  No items found.`);
      continue;
    }

    logs.push(`  Found ${rawDeals.length} items`);

    // ── Step 2: Process each item ──
    for (const raw of rawDeals) {
      // Dedup: check if we already imported from this source URL
      const { data: existing } = await supabaseAdmin
        .from("deals")
        .select("id")
        .eq("sourceUrl", raw.link)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // ── Step 3: LLM rewrite + extract direct retailer URL ──
      const { deal, error } = await rewriteDeal(raw);

      if (!deal || error) {
        failed++;
        logs.push(`  ❌ "${raw.title.slice(0, 50)}": ${error ?? "Unknown"}`);
        continue;
      }

      // ── Step 4: Generate slug ──
      const slugBase = deal.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      const slugSuffix = Date.now().toString(36).slice(-4);
      const slug = `${slugBase}-${slugSuffix}`;

      // ── Step 5: Insert into Supabase ──
      const { error: insertError } = await supabaseAdmin
        .from("deals")
        .insert({
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
          sourceUrl: raw.link,
          active: true,
        });

      if (insertError) {
        failed++;
        logs.push(`  ❌ Insert failed for "${deal.title.slice(0, 50)}": ${insertError.message}`);
      } else {
        imported++;
        logs.push(`  ✅ Imported: ${deal.title.slice(0, 60)} → ${deal.store}`);
      }
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
}