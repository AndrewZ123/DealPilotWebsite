import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4.5";

// In-memory cache
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

// Noise suffixes that add no useful info
const SUFFIX_PATTERNS = [
  /\s*[-–—]\s*(free shipping|free delivery|store pickup|prime)\s*$/gi,
  /\s*\((\d+)\s*(pcs?|pieces?|pk|pack|count|ct)\)\s*$/gi, // keep pack count
];

function distillTitle(title: string): string {
  let t = title;

  // Remove store prefix like "Walgreens: " or "Amazon: "
  t = t.replace(/^[A-Z][A-Za-z]+:\s*/, "");

  // Strip known noise patterns
  for (const p of NOISE_PATTERNS) {
    p.lastIndex = 0;
    t = t.replace(p, "");
  }

  // Remove extra "for $X.XX" at end (we show price separately)
  t = t.replace(/\s+for\s+\$?\d+(\.\d{2})?\s*$/i, "");

  // Remove trailing dashes
  t = t.replace(/\s+[-–—]\s*$/, "");

  // Remove trailing parenthetical pack info IF title is still long
  if (t.length > 50) {
    t = t.replace(/\s*\(\d+\s*(pcs?|pieces?|pk|pack|count|ct)\)\s*$/i, "");
  }

  // Collapse multiple spaces
  t = t.replace(/\s{2,}/g, " ").trim();

  // Remove trailing commas/semicolons
  t = t.replace(/[,;]\s*$/, "");

  return t.trim();
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
  if (!ZAI_API_KEY) {
    console.log("[ticker] No ZAI_API_KEY, skipping LLM");
    return null;
  }

  const dealList = deals
    .map(
      (d, i) =>
        `${i + 1}. "${d.title}" | ${d.store} | was $${d.originalPrice.toFixed(2)} now $${d.salePrice.toFixed(2)} (${d.discountPercent}% off) | ${d.category}`
    )
    .join("\n");

  const systemPrompt = `Rewrite deal titles as SHORT ticker headlines. DISTILL each product to its simplest recognizable name.

RULES:
- Strip brand noise, model numbers, color/size qualifiers, shipping info
- Keep the core product identity recognizable
- "totes Adult's Red Rain Poncho" → "Rain Poncho"  
- "Amazon Basics CR2032 3V Lithium Batteries (10-Pack)" → "CR2032 Batteries 10-Pack"
- "adidas Men's Ultimashow Athletic Shoes in 2 Colors" → "Adidas Running Shoes"
- "RYOBI 18V ONE+ AirStrike 18GA Brad Nailer" → "RYOBI Brad Nailer"
- Format: emoji + product name + $rounded_price + (% off)
- Round prices to whole dollars
- Each headline under 60 chars, complete and coherent
- NEVER use "..." or "…" to truncate
- ONE emoji per headline

OUTPUT: {"headlines": ["..."]}`;

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
          { role: "user", content: `Rewrite these deals:\n\n${dealList}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.log(`[ticker] LLM API error: ${res.status} ${await res.text().catch(() => "")}`);
      return null;
    }

    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    // glm-4.5 reasoning model: actual output in content, thinking in reasoning_content
    let content = msg?.content || "";
    // If content is empty, try to extract JSON from reasoning_content
    if (!content && msg?.reasoning_content) {
      const jsonMatch = msg.reasoning_content.match(/\{[\s\S]*"headlines"[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
    }
    content = content.trim();
    if (!content) {
      console.log("[ticker] No content in LLM response", JSON.stringify(msg).slice(0, 300));
      return null;
    }

    const parsed = JSON.parse(content);
    const headlines: unknown[] = Array.isArray(parsed) ? parsed : parsed.headlines ?? parsed.items ?? [];

    if (!Array.isArray(headlines) || headlines.length === 0) {
      console.log("[ticker] No headlines array in LLM response");
      return null;
    }

    console.log(`[ticker] LLM generated ${headlines.length} headlines`);
    return headlines.filter((h): h is string => typeof h === "string").slice(0, 10);
  } catch (err) {
    console.log(`[ticker] LLM error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function GET() {
  if (cachedItems && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json({ items: cachedItems });
  }

  const { data: deals, error } = await supabase
    .from("deals")
    .select("title, slug, store, originalPrice, salePrice, discountPercent, category")
    .eq("active", true)
    .order("createdAt", { ascending: false })
    .limit(10);

  if (error || !deals || deals.length === 0) {
    if (cachedItems) return NextResponse.json({ items: cachedItems });
    return NextResponse.json({
      items: ["🔥 DealPilot — Best deals updated every 15 minutes"],
    });
  }

  // Try LLM first
  const llmHeadlines = await generateLLMHeadlines(deals);

  // Fallback: distill titles with regex
  const headlines = llmHeadlines || deals.map((d) => {
    const emoji = categoryEmoji(d.category);
    const clean = distillTitle(d.title);
    const price = `$${Math.round(d.salePrice)}`;
    return `${emoji} ${clean} ${price} (${d.discountPercent}% off)`;
  });

  cachedItems = headlines;
  cachedAt = Date.now();

  return NextResponse.json({ items: headlines });
}