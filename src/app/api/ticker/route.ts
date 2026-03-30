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
        `${i + 1}. "${d.title}" | ${d.store} | was $${d.originalPrice.toFixed(2)} → now $${d.salePrice.toFixed(2)} (${d.discountPercent}% off) | category: ${d.category}`
    )
    .join("\n");

  const systemPrompt = `You write SHORT, punchy ticker headlines for a deal site. Your job is to DISTILL each deal to its essence.

RULES:
- Rename the product to its simplest recognizable form. Drop brand noise, model numbers, qualifiers, color/size variants.
  "totes Adult's Red Rain Poncho" → "Rain Poncho"
  "Amazon Basics CR2032 3V Lithium Batteries (10-Pack)" → "CR2032 Batteries 10-Pack"
  "adidas Men's Ultimashow Athletic Shoes in 2 Colors" → "Adidas Running Shoes"
- Format: emoji + short product name + sale price + discount %
- Use rounded whole dollars (no cents)
- Keep each headline under 60 chars — but NEVER use "..." or "…" to truncate
- Every headline must be a complete, coherent phrase
- Start with ONE relevant emoji matching the category

Examples of PERFECT output:
🌧️ Rain Poncho $4 (66% off)
🔋 CR2032 Batteries 10-Pack $7 (34% off)
👟 Adidas Running Shoes $24 (60% off)
🎸 Gretsch Guitars from $150 (40% off)
🧱 LEGO Flower Bouquet $38 (23% off)

Respond with a JSON object: {"headlines": ["...", "..."]}
No markdown, no explanation.`;

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
          { role: "user", content: `Generate ticker headlines for these deals:\n\n${dealList}` },
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
    if (cachedItems) {
      return NextResponse.json({ items: cachedItems });
    }
    return NextResponse.json({
      items: ["🔥 DealPilot — Best deals updated every 15 minutes"],
    });
  }

  // Try LLM headlines, fall back to simple template
  const headlines = (await generateLLMHeadlines(deals)) || deals.map((d) => {
    const emoji = categoryEmoji(d.category);
    return `${emoji} ${d.title.split(" - ")[0].split(" — ")[0]} $${Math.round(d.salePrice)} (${d.discountPercent}% off)`;
  });

  // Update cache
  cachedItems = headlines;
  cachedAt = Date.now();

  return NextResponse.json({ items: headlines });
}