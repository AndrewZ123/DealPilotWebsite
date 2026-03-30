/**
 * Fetches and parses RSS/Atom feeds into a normalized format.
 *
 * Uses fast-xml-parser for zero-dependency XML parsing.
 * Extracts: title, link, description, content (HTML), pubDate.
 */

import { XMLParser } from "fast-xml-parser";
import type { RSSSource } from "./rss-sources";

export interface RawRSSDeal {
  /** Item title from the feed */
  title: string;
  /** Link from the feed (usually points to the deal site) */
  link: string;
  /** Plain-text description / excerpt */
  description: string;
  /** Full HTML content (content:encoded or summary) — may contain retailer links */
  content: string;
  /** Publication date string */
  pubDate: string;
  /** Source feed name (for logging) */
  sourceName: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => name === "item" || name === "entry",
});

/**
 * Fetch and parse a single RSS feed into raw deal items.
 */
export async function fetchRSSFeed(
  source: RSSSource
): Promise<{ deals: RawRSSDeal[]; errors: string[] }> {
  const errors: string[] = [];
  const deals: RawRSSDeal[] = [];

  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DealPilot/1.0; +https://dealpilot.org)",
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
      },
      signal: AbortSignal.timeout(8_000), // 8s timeout per feed
    });

    if (!res.ok) {
      errors.push(`${source.name}: HTTP ${res.status}`);
      return { deals, errors };
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);

    // Handle RSS 2.0 format
    const rssItems = parsed?.rss?.channel?.item ?? [];
    // Handle Atom format
    const atomEntries = parsed?.feed?.entry ?? [];

    const items = rssItems.length > 0 ? rssItems : atomEntries;

    for (const item of items.slice(0, source.maxItems)) {
      try {
        // Normalize RSS vs Atom fields
        const title =
          item.title?.["#text"] ?? item.title ?? "Untitled Deal";
        const link =
          item.link?.["@_href"] ?? // Atom
          item.link?.["#text"] ?? // RSS with attributes
          item.link ?? // Simple RSS
          "";
        const description =
          item.description ??
          item.summary ??
          item.content?.["#text"] ??
          "";
        const content =
          item["content:encoded"]?.["#text"] ??
          item["content:encoded"] ??
          item.content?.["#text"] ??
          item.content ??
          item.summary ??
          "";
        const pubDate =
          item.pubDate ?? item.published ?? item.updated ?? "";

        deals.push({
          title: typeof title === "string" ? title : String(title),
          link: typeof link === "string" ? link : String(link),
          description:
            typeof description === "string" ? description : String(description),
          content: typeof content === "string" ? content : String(content),
          pubDate: typeof pubDate === "string" ? pubDate : String(pubDate),
          sourceName: source.name,
        });
      } catch {
        errors.push(`${source.name}: Failed to parse an item, skipping`);
      }
    }
  } catch (err) {
    errors.push(
      `${source.name}: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  return { deals, errors };
}