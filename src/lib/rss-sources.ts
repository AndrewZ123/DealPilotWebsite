/**
 * RSS feed sources for auto-importing deals.
 *
 * Each source defines:
 *  - url: The RSS/Atom feed URL
 *  - name: Human-readable label for logging
 *  - maxItems: Max items to process per run (keeps within Vercel timeout)
 */

export interface RSSSource {
  url: string;
  name: string;
  maxItems: number;
}

export const RSS_SOURCES: RSSSource[] = [
  {
    name: "Slickdeals — Hot Deals",
    url: "https://slickdeals.net/newsearch.php?mode=popularity&rss=1",
    maxItems: 5,
  },
  {
    name: "DealNews — Latest",
    url: "https://www.dealnews.com/rss.xml",
    maxItems: 5,
  },
  {
    name: "Kinja Deals",
    url: "https://feeds.kinja.com/kinjadeals",
    maxItems: 5,
  },
  {
    name: "Brad's Deals",
    url: "https://www.bradsdeals.com/rss",
    maxItems: 5,
  },
];