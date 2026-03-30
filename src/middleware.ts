/**
 * DealPilot Middleware
 *
 * Sets Cache-Control headers on public deal pages to prevent CDN/edge caching.
 * This ensures that when admin creates, updates, or deletes a deal,
 * the public website immediately reflects the change.
 *
 * Without this, Vercel's edge cache may serve stale pages even after
 * revalidatePath() is called from the admin API.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to public-facing pages that display deals
  const isDealPage =
    pathname === "/" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/deals/") ||
    pathname === "/sitemap.xml";

  if (isDealPage) {
    const response = NextResponse.next();
    // Tell Vercel CDN and browsers never to cache deal pages
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    response.headers.set("X-DealPilot-Cache", "bypass");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static assets, API routes, and admin pages
  matcher: [
    "/",
    "/category/:slug*",
    "/deals/:slug*",
    "/sitemap.xml",
  ],
};