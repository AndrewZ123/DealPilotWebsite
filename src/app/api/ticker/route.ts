import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4.5";

// In-memory cache (resets on cold start, which is fine — it'll regenerate)
let cachedItems: string[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface DealRow {
  title: string;
  slug: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
}

function buildFallbackHeadlines(deals: DealRow[]): string[] {
  return deals.map((d) => {
    const emoji = categoryEmoji(d.category);
    if (d.discountPercent >= 20) {
      return `${emoji} ${d.title} — ${d.discountPercent}% off (was $${d.originalPrice.toFixed(2)}, now $${d.salePrice.toFixed(2)})`;
    }
    return `${emoji} ${d.title} — $${d.salePrice.toFixed(2)} at ${d.store}`;
  });
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    Tech: "⚡",
    Home: "🏠",
    Fashion: "👗",
    Toys: "🧸",
    Misc: "🏷️",
  };
  return map[cat] || "🔥";
}

async function generateLLMHeadlines(deals: DealRow[]): Promise<string[] | null> {
  if (!ZAI_API_KEY) return null;

  const dealList = deals
    .map(
      (d, i) =>
        `${i + 1}. ${d.title} | ${d.store} | was $${d.originalPrice.toFixed(2)} → now $${d.salePrice.toFixed(2)} (${d.discountPercent}% off) | ${d.category}`
    )
    .join("\n");

  const systemPrompt = `You are DealPilot's marketing copywriter. You receive a list of deals and generate SHORT, punchy, one-line headlines for a scrolling ticker bar. Each headline should be engaging and include the key savings info. Start each with a relevant emoji. Keep each headline under 80 characters. Do NOT use quotes around the headlines.

Example style:
🔥 Sony WH-1000XM5 just dropped to $248 — 38% off!
⚡ Robot Vacuum with mapping for $199 (was $399)
🏷️ AirPods Pro 2 at lowest price this month

Respond with a JSON array of strings only. No markdown, no explanation.`;

  try {
    const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: ZAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate catchy one-line headlines for these deals:\n\n${dealList}` },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const headlines: unknown[] = Array.isArray(parsed) ? parsed : parsed.headlines ?? parsed.items ?? [];

    if (!Array.isArray(headlines) || headlines.length === 0) return null;

    // Validate each item is a string
    return headlines.filter((h): h is string => typeof h === "string").slice(0, 10);
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cache if still fresh
  if (cachedItems && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json({ items: cachedItems });
  }

  // Fetch 10 most recent active deals
  const { data: deals, error } = await supabase
    .from("deals")
    .select("title, slug, store, originalPrice, salePrice, discountPercent, category")
    .eq("active", true)
    .order("createdAt", { ascending: false })
    .limit(10);

  if (error || !deals || deals.length === 0) {
    // Return existing cache (even if stale) or empty
    if (cachedItems) {
      return NextResponse.json({ items: cachedItems });
    }
    return NextResponse.json({
      items: ["🔥 DealPilot — Best deals updated every 15 minutes"],
    });
  }

  // Try LLM headlines, fall back to template
  const headlines = (await generateLLMHeadlines(deals)) || buildFallbackHeadlines(deals);

  // Update cache
  cachedItems = headlines;
  cachedAt = Date.now();

  return NextResponse.json({ items: headlines });
}