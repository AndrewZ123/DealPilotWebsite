/**
 * Sends raw RSS deal data to the LLM for:
 *  1. Extracting the DIRECT retailer URL (not the deal-site link)
 *  2. Rewriting title & description in DealPilot's voice
 *  3. Extracting structured data: store, prices, category
 */

import type { RawRSSDeal } from "./rss-parser";

const ZAI_API_KEY = process.env.ZAI_API_KEY || "";
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4.5";

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

const SYSTEM_PROMPT = `You are DealPilot's deal curator AI. You receive raw RSS feed items from deal websites and must output clean, structured deal data.

RULES:

TITLE (most important):
- MAXIMUM 70 CHARACTERS. Never exceed this.
- Product name + key spec only. Example: "Sony WH-1000XM5 Headphones" or "KitchenAid Stand Mixer 5-Qt"
- Do NOT include prices, discounts, shipping info, or store names in the title.
- Do NOT include phrases like "for Sale", "Discount", "Best Price", or "% off".
- Remove brand slogans, marketing fluff, and DealNews/Slickdeals branding.

DESCRIPTION:
- 1-2 short sentences about why this is a good deal. Friendly, factual tone.

PRICES (CRITICAL):
- ONLY use prices explicitly stated in the source text. Do NOT estimate or guess.
- originalPrice = the regular/list price BEFORE the discount.
- salePrice = the current deal price AFTER the discount.
- If you can only find the sale price but not the original, set originalPrice to 0 and salePrice to 0.
- If NO price is mentioned at all, set both to 0 (the deal will be skipped).
- NEVER make up prices or calculate them from percentage discounts alone.

STORE:
- The actual retailer (Amazon, Best Buy, Walmart, etc.), NOT the deal site (Slickdeals, DealNews).

DIRECT URL:
- Find the direct retailer link from the HTML content. If not found, construct a search URL like "https://www.amazon.com/s?k=product+name".
- NEVER return links to slickdeals.net, dealnews.com, kinja.com, bradsdeals.com, or any deal aggregator.

CATEGORY — choose exactly one: Tech, Home, Fashion, Toys, Misc

Respond with valid JSON only, no markdown or explanation:
{"title":"...","description":"...","store":"...","directUrl":"...","originalPrice":99.99,"salePrice":49.99,"discountPercent":50,"category":"Tech"}`;

/** Max allowed title length — longer titles are truncated */
const MAX_TITLE_LENGTH = 70;

/** Minimum realistic price in dollars — anything below is likely a parsing error */
const MIN_REALISTIC_PRICE = 0.5;

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
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(25_000), // 25s timeout for LLM
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

    // ── Post-processing: enforce title constraints ──
    // Strip any remaining price/discount patterns the LLM snuck into the title
    parsed.title = parsed.title
      .replace(/\s*[\$]\d+(\.\d{2})?(\s*-\s*\$?\d+(\.\d{2})?)?\s*/g, " ")  // $XX.XX or $XX - $YY
      .replace(/\s*\d{1,3}%\s*off\s*/gi, " ")                                   // XX% off
      .replace(/\s*[-–—]\s*\$?\d+(\.\d{2})?\s*/g, " ")                          // trailing dash + price
      .replace(/\s*for\s*\$\d+/gi, "")                                            // "for $XX"
      .replace(/\s*(plus|w\/|with)\s*free\s*shipping.*$/gi, "")                  // shipping info
      .replace(/\s*\(?\d{1,3}%\s*off\)?\s*/gi, " ")                              // (XX% off)
      .replace(/\s{2,}/g, " ")                                                    // collapse whitespace
      .trim();

    // Hard truncate at MAX_TITLE_LENGTH
    if (parsed.title.length > MAX_TITLE_LENGTH) {
      parsed.title = parsed.title.slice(0, MAX_TITLE_LENGTH).replace(/\s+\S*$/, "").trim();
    }

    // Reject if title ended up too short after cleaning
    if (parsed.title.length < 5) {
      return { deal: null, error: `Title too short after cleanup: "${parsed.title}"` };
    }

    // ── Post-processing: validate prices ──
    parsed.originalPrice = Number(parsed.originalPrice) || 0;
    parsed.salePrice = Number(parsed.salePrice) || 0;
    parsed.discountPercent = Number(parsed.discountPercent) || 0;

    // Reject unrealistic prices (< $0.50 is almost certainly a parsing error)
    if (parsed.salePrice > 0 && parsed.salePrice < MIN_REALISTIC_PRICE) {
      return { deal: null, error: `Sale price unrealistically low: $${parsed.salePrice}` };
    }
    if (parsed.originalPrice > 0 && parsed.originalPrice < MIN_REALISTIC_PRICE) {
      return { deal: null, error: `Original price unrealistically low: $${parsed.originalPrice}` };
    }

    // Reject if sale > original (nonsensical)
    if (parsed.originalPrice > 0 && parsed.salePrice > parsed.originalPrice) {
      return { deal: null, error: `Sale ($${parsed.salePrice}) > original ($${parsed.originalPrice})` };
    }

    // Recalculate discount from actual prices (don't trust LLM's math)
    if (parsed.originalPrice > 0 && parsed.salePrice > 0) {
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