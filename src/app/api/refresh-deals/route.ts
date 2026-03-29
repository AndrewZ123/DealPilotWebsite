import { NextRequest, NextResponse } from "next/server";
import { generateDeals, archiveOldDeals } from "@/lib/deals";
import { isAuthorized } from "@/lib/auth";

// POST /api/refresh-deals — auto-populate new deals and archive old ones.
//
// Requires admin token or API key. Can be called by cron or manually.
//
// Query params:
//   count  — number of new deals to generate (default 5, max 20)
//   expire — days after which to archive deals (default 30)
//
// CRON WIRING EXAMPLES:
//
// Vercel — add to vercel.json:
//   { "crons": [{ "path": "/api/refresh-deals", "schedule": "0 */6 * * *" }] }
//
// Server crontab (runs every 6 hours):
//   0 */6 * * * curl -X POST -H "Authorization: Bearer YOUR_TOKEN" https://yourdomain.com/api/refresh-deals
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const count = Math.min(20, Math.max(1, Number(searchParams.get("count") || "5")));
  const expire = Math.max(1, Number(searchParams.get("expire") || "30"));

  const [created, archived] = await Promise.all([
    generateDeals(count),
    archiveOldDeals(expire),
  ]);

  return NextResponse.json({
    message: "Refresh complete",
    created,
    archived,
  });
}

// Also allow GET for simple cron ping
export async function GET(req: NextRequest) {
  return POST(req);
}