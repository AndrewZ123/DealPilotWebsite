/**
 * Redirect / affiliate URL helpers.
 *
 * Currently this simply returns the stored finalUrl unchanged.
 *
 * HOW TO ADD REAL AFFILIATE IDS LATER:
 *
 * 1. Amazon — append ?tag=yourassocid-20 to the URL.
 *    Example: buildAffiliateUrl("https://www.amazon.com/dp/B00XXXX", "amazon")
 *             → "https://www.amazon.com/dp/B00XXXX?tag=yourassocid-20"
 *
 * 2. CJ / Impact Radius — replace the URL with the network tracking link
 *    that already embeds your publisher ID and the destination.
 *    Example: `https://track.flexlinks.com/a.ashx?foid=XXX&foc=XXX&fot=XXX&fos=1`
 *
 * 3. ShareASale / Rakuten — similar redirect pattern with your aff ID param.
 *
 * To extend, create a map of domain → transform function and apply it below.
 */

export function buildAffiliateUrl(finalUrl: string): string {
  // TODO: Add affiliate parameter injection per network here.
  // Example:
  //   const url = new URL(finalUrl);
  //   if (url.hostname.includes("amazon")) url.searchParams.set("tag", "your-id-20");
  //   return url.toString();

  return finalUrl;
}