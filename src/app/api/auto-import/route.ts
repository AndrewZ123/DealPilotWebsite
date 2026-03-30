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

// Track whether sourceUrl column exists (avoid repeated failed queries)
let sourceUrlColumnExists = true;

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
      // Dedup: check if we already imported this deal
      let isDuplicate = false;

      if (sourceUrlColumnExists) {
        try {
          const { data: existing, error: dedupError } = await supabaseAdmin
            .from("deals")
            .select("id")
            .eq("sourceUrl", raw.link)
            .maybeSingle();

          if (dedupError) {
            // Column likely doesn't exist — fall back to title-based dedup
            if (dedupError.message?.includes("does not exist")) {
              sourceUrlColumnExists = false;
              logs.push(`  ℹ️ sourceUrl column not found, using title-based dedup`);
            }
          } else if (existing) {
            skipped++;
            isDuplicate = true;
          }
        } catch {
          sourceUrlColumnExists = false;
        }
      }

      // Fallback: title-based dedup
      if (!isDuplicate && !sourceUrlColumnExists) {
        const normalizedTitle = raw.title.toLowerCase().trim().slice(0, 100);
        const { data: existingByTitle } = await supabaseAdmin
          .from("deals")
          .select("id")
          .ilike("title", `${normalizedTitle}%`)
          .limit(1)
          .maybeSingle();

        if (existingByTitle) {
          skipped++;
          isDuplicate = true;
        }
      }

      if (isDuplicate) continue;

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
      const slugSuffix = Date.now().toString(36).slice(-4) +
        Math.random().toString(36).slice(2, 5);
      const slug = `${slugBase}-${slugSuffix}`;

      // ── Step 5: Insert into Supabase ──
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

      // Only include sourceUrl if the column exists
      if (sourceUrlColumnExists) {
        insertData.sourceUrl = raw.link;
      }

      const { error: insertError } = await supabaseAdmin
        .from("deals")
        .insert(insertData);

      if (insertError) {
        // If sourceUrl column is the issue, retry without it
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
            failed++;
            logs.push(`  ❌ Insert failed for "${deal.title.slice(0, 50)}": ${retryError.message}`);
            continue;
          }
        } else {
          failed++;
          logs.push(`  ❌ Insert failed for "${deal.title.slice(0, 50)}": ${insertError.message}`);
          continue;
        }
      }

      imported++;
      logs.push(`  ✅ Imported: ${deal.title.slice(0, 60)} → ${deal.store}`);
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