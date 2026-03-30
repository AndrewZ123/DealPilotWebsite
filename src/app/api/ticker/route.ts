import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// In-memory cache (per serverless instance)
let cachedItems: string[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface DealRow {
  title: string;
  slug: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
}

const NOISE_PATTERNS = [
  /\bwith (free )?(shipping|store pickup|prime delivery|in-store pickup|delivery|store\s*pickup)\b/gi,
  /\bwith\s+\$?\d+(\.\d{2})?\s*(shipping|delivery)\b/gi,
  /\bfor (men|women|men & women|boys|girls|kids|adults?|her|him)\b/gi,
  /\bin \d+ (colors?|sizes?|variants?)\b/gi,
  /\bvarious models starting at\b/gi,
  /\bstarting at \$?\d+/gi,
  /\b(factory blemished|reconditioned|certified refurbished|open[- ]box)\b/gi,
  /\bfor \$?\d+(\.\d{2})?\b(?=\s*$|\s*\()/gi,
  /\b(?:various|multiple|assorted)\s+(models?|sizes?|colors?|styles?)\b/gi,
];

function distillTitle(title: string): string {
  let t = title;
  t = t.replace(/^[A-Z][A-Za-z]+:\s*/, "");
  for (const p of NOISE_PATTERNS) {
    p.lastIndex = 0;
    t = t.replace(p, "");
  }
  t = t.replace(/\s+for\s+\$?\d+(\.\d{2})?\s*$/i, "");
  t = t.replace(/\s+[-–—]\s*$/, "");
  if (t.length > 50) {
    t = t.replace(/\s*\(\d+\s*(pcs?|pieces?|pk|pack|count|ct)\)\s*$/i, "");
  }
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/[,;]\s*$/, "");
  return t.trim();
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    tech: "⚡",
    home: "🏠",
    fashion: "👗",
    toys: "🧸",
    misc: "🏷️",
  };
  return map[(cat || "").toLowerCase()] || "🔥";
}

export async function GET() {
  // Return cached items if fresh
  if (cachedItems && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json({ items: cachedItems });
  }

  try {
    // Get top deals from the last 3 hours (sorted by highest discount)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const { data: recentDeals, error: err1 } = await supabase
      .from("deals")
      .select("title, slug, store, originalPrice, salePrice, discountPercent, category")
      .eq("active", true)
      .gte("createdAt", threeHoursAgo)
      .order("discountPercent", { ascending: false })
      .limit(10);

    let finalDeals: DealRow[] | null = !err1 && recentDeals && recentDeals.length >= 3
      ? recentDeals
      : null;

    // If fewer than 3 recent deals, fall back to best deals overall
    if (!finalDeals) {
      const { data: bestDeals, error: err2 } = await supabase
        .from("deals")
        .select("title, slug, store, originalPrice, salePrice, discountPercent, category")
        .eq("active", true)
        .order("discountPercent", { ascending: false })
        .limit(10);

      if (err2 || !bestDeals || bestDeals.length === 0) {
        // Return cached items or minimal fallback
        if (cachedItems) return NextResponse.json({ items: cachedItems });
        return NextResponse.json({
          items: ["🔥 DealPilot — Best deals updated every 15 minutes"],
        });
      }
      finalDeals = bestDeals;
    }

    // Generate headlines using regex (fast, no LLM needed)
    const headlines = finalDeals.map((d) => {
      const emoji = categoryEmoji(d.category);
      const clean = distillTitle(d.title);
      const price = `$${Math.round(d.salePrice)}`;
      return `${emoji} ${clean} ${price} (${d.discountPercent}% off)`;
    });

    cachedItems = headlines;
    cachedAt = Date.now();

    return NextResponse.json({ items: headlines });
  } catch (err) {
    console.error("[ticker] Error:", err);
    // Return cached or fallback
    if (cachedItems) return NextResponse.json({ items: cachedItems });
    return NextResponse.json({
      items: ["🔥 DealPilot — Best deals updated every 15 minutes"],
    });
  }
}