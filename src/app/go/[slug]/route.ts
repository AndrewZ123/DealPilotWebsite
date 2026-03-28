import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAffiliateUrl } from "@/lib/redirect";

/**
 * GET /go/[slug] — redirect tracker.
 *
 * 1. Looks up the deal by slug.
 * 2. Increments the click count.
 * 3. Logs the click (for future analytics).
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

  const deal = await prisma.deal.findUnique({ where: { slug } });

  if (!deal || !deal.active) {
    return NextResponse.redirect(new URL("/?not-found=1", req.url));
  }

  // Increment click count (fire-and-forget style)
  await prisma.deal.update({
    where: { id: deal.id },
    data: { clicks: { increment: 1 } },
  }).catch(() => {
    // Non-critical — don't block redirect on error
  });

  // Optionally log click details for analytics
  try {
    await prisma.clickLog.create({
      data: {
        dealId: deal.id,
        referer: req.headers.get("referer") || "",
        userAgent: req.headers.get("user-agent") || "",
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
      },
    });
  } catch {
    // Non-critical
  }

  // Build the final URL (with optional affiliate params)
  const targetUrl = buildAffiliateUrl(deal.finalUrl);

  return NextResponse.redirect(targetUrl, 302);
}