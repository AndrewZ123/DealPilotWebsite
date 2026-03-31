import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { buildAffiliateUrl } from "@/lib/redirect";

/**
 * GET /go/[slug] — Redirect tracker.
 *
 * 1. Looks up the deal by slug (admin client to access finalUrl).
 * 2. Increments the click count (fire-and-forget).
 * 3. Logs the click for analytics (fire-and-forget).
 * 4. 302 redirects to the final URL (optionally with affiliate params).
 *
 * HOW TO ADD AFFILIATE PARAMS:
 * Edit src/lib/redirect.ts → buildAffiliateUrl() to inject network-specific
 * tracking parameters (e.g. ?tag=associd-20 for Amazon, or replace the URL
 * entirely with a CJ/Impact/ShareASale tracking link).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("id, slug, finalUrl, active, clicks")
    .eq("slug", slug)
    .single();

  if (!deal || !deal.active) {
    return NextResponse.redirect(new URL("/?not-found=1", req.url));
  }

  // Increment click count atomically via RPC (avoids race condition)
  void supabaseAdmin.rpc("increment_clicks", { deal_id: deal.id });

  // Log click details for analytics (fire-and-forget)
  void (async () => {
    try {
      await supabaseAdmin.from("click_logs").insert({
        dealId: deal.id,
        referer: req.headers.get("referer") || "",
        userAgent: req.headers.get("user-agent") || "",
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
      });
    } catch { /* non-critical */ }
  })();

  // Build the final URL (with optional affiliate params)
  const targetUrl = buildAffiliateUrl(deal.finalUrl);

  return NextResponse.redirect(targetUrl, 302);
}