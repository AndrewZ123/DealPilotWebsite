// Verified working RSS feeds — last checked 2026-03-30
export interface RssSource {
  name: string;
  url: string;
  /** Max items to process per source per run */
  maxItems: number;
}

export const RSS_SOURCES: RssSource[] = [
  {
    name: 'Slickdeals — Hot Deals',
    url: 'https://slickdeals.net/newsearch.php?mode=frontpage&q=&searcharea=deals&searchin=first&rss=1',
    maxItems: 15,
  },
  {
    name: 'Slickdeals — FeedBurner',
    url: 'https://feeds.feedburner.com/Slickdealsnet',
    maxItems: 15,
  },
  {
    name: 'CNET Deals',
    url: 'https://www.cnet.com/rss/deals/',
    maxItems: 20,
  },
];