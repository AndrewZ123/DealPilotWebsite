/**
 * Sends raw RSS deal data to the LLM for:
 *  1. Extracting the DIRECT retailer URL (not the deal-site link)
 *  2. Rewriting title & description in DealPilot's voice
 *  3. Extracting structured data: store, prices, category
 */

import type { RawRSSDeal } from "./rss-parser";

const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.z.ai/v1";
const ZAI_MODEL = process.env.ZAI_MODEL || "gpt-4o-mini";

export interface LLMDraftedDeal {
  title: string;
  description: string;
  store: string;
  directUrl: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
}

const SYSTEM_PROMPT = `You are DealPilot's deal curator AI. You receive raw RSS feed items from deal websites and must:

1. FIND THE DIRECT RETAILER URL: The RSS item links to a deal site (like Slickdeals, DealNews). Inside the HTML content there is usually a direct link to the actual retailer (Amazon, Best Buy, Walmart, etc.). Extract that direct retailer URL. If you can't find one, construct a search URL for the retailer (e.g. "https://www.amazon.com/s?k=product+name"). NEVER return a link to slickdeals.net, dealnews.com, kinja.com, bradsdeals.com, or any other deal aggregator.

2. REWRITE the title to be clear and engaging. Include the product name and key spec. No clickbait.

3. WRITE a 2-sentence description that highlights the value proposition in a friendly tone.

4. EXTRACT the store name (the actual retailer, not the deal site).

5. EXTRACT prices: original price (MSRP/regular) and sale price. Calculate the discount percentage. If only one price is mentioned, estimate the original based on typical discount.

6. ASSIGN a category from this list: Tech, Home, Fashion, Toys, Outdoor, Kitchen, Beauty, Gaming, Audio, Computers, Phones, TV, Fitness, Food, Travel, Misc

You MUST respond with valid JSON only — no markdown, no explanation. Use this exact shape:
{"title":"...","description":"...","store":"...","directUrl":"...","originalPrice":99.99,"salePrice":49.99,"discountPercent":50,"category":"Tech"}`;

/**
 * Send a raw RSS deal to the LLM and get back a structured, rewritten deal.
 */
export async function rewriteDeal(
  raw: RawRSSDeal
): Promise<{ deal: LLMDraftedDeal | null; error?: string }> {
  const userContent = `RSS FEED ITEM:
Title: ${raw.title}
Source Link: ${raw.link}
Source: ${raw.sourceName}
Description: ${raw.description}
HTML Content: ${raw.content.slice(0, 3000)}

Extract the direct retailer link, rewrite this deal, and return the JSON.`;

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12_000), // 12s timeout for LLM
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { deal: null, error: `LLM API ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return { deal: null, error: "LLM returned empty response" };
    }

    const parsed = JSON.parse(content) as LLMDraftedDeal;

    // Validate required fields
    if (!parsed.title || !parsed.store || !parsed.directUrl) {
      return { deal: null, error: "LLM response missing required fields" };
    }

    // Validate directUrl isn't a deal aggregator
    const aggregatorDomains = [
      "slickdeals.net",
      "dealnews.com",
      "kinja.com",
      "theinventory.com",
      "bradsdeals.com",
      "dealmac.com",
      "dealmoon.com",
      "fatwallet.com",
    ];
    const urlLower = parsed.directUrl.toLowerCase();
    const isAggregator = aggregatorDomains.some((d) => urlLower.includes(d));
    if (isAggregator) {
      return {
        deal: null,
        error: `LLM returned aggregator URL: ${parsed.directUrl}`,
      };
    }

    // Ensure prices are valid numbers
    parsed.originalPrice = Number(parsed.originalPrice) || 0;
    parsed.salePrice = Number(parsed.salePrice) || 0;
    parsed.discountPercent = Number(parsed.discountPercent) || 0;

    // Recalculate discount if missing or zero
    if (
      parsed.originalPrice > 0 &&
      parsed.salePrice > 0 &&
      parsed.discountPercent === 0
    ) {
      parsed.discountPercent = Math.round(
        ((parsed.originalPrice - parsed.salePrice) / parsed.originalPrice) * 100
      );
    }

    return { deal: parsed };
  } catch (err) {
    return {
      deal: null,
      error: `LLM error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}