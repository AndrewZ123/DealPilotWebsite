# DealPilot — Affiliate Deal Site

A modern, production-ready affiliate deals website built with **Next.js 14**, **TailwindCSS**, and **Supabase**.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Then edit .env with your Supabase credentials

# Run development server
npm run dev
```

Visit `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret — server-side only) |
| `ADMIN_TOKEN` | Secret token for admin routes |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (e.g. `https://dealpilot.com`) |

## Database Setup

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and run the contents of `supabase/migration.sql`
3. Seed with sample deals:
   ```bash
   npm run db:seed
   ```

## Deploy to Vercel

### Option A: One-click deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables (do this in Vercel dashboard or CLI)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ADMIN_TOKEN
vercel env add NEXT_PUBLIC_SITE_URL

# Redeploy with env vars
vercel --prod
```

### Option B: Deploy via GitHub

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Add all environment variables listed above
5. Click **Deploy**

### Cron Jobs (Auto-refresh deals)

The `vercel.json` includes a cron that calls `/api/refresh-deals` once daily at 6:00 AM UTC. This works on Vercel's Hobby plan.

For more frequent refreshes, set up a free external cron at [cron-job.org](https://cron-job.org) pointing to `https://your-domain.com/api/refresh-deals` (e.g., every 6 hours). You can also trigger it manually anytime:

```bash
curl https://your-domain.com/api/refresh-deals
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home — Latest Deals
│   ├── layout.tsx                  # Root layout (nav, footer)
│   ├── deals/[slug]/page.tsx       # Deal detail page
│   ├── category/[slug]/page.tsx    # Category filtered view
│   ├── about/page.tsx              # About page
│   ├── disclosure/page.tsx         # Affiliate Disclosure
│   ├── contact/page.tsx            # Contact page
│   ├── admin/                      # Admin dashboard (token-protected)
│   ├── go/[slug]/route.ts          # Redirect tracker
│   ├── api/                        # API routes (deals CRUD, refresh)
│   ├── sitemap.ts                  # Dynamic sitemap
│   └── robots.ts                   # robots.txt
├── components/                     # Shared UI components
├── lib/                            # Database, helpers, categories
└── types/                          # TypeScript types
```

## Adding Real Affiliate IDs

Edit `src/lib/redirect.ts`. The `buildAffiliateUrl()` function shows where to inject affiliate parameters per network:

```typescript
// Example: Amazon Associates
if (finalUrl.includes('amazon.com')) {
  url.searchParams.set('tag', 'your-amazon-tag-20');
}
// Example: CJ / Impact Radius
url.searchParams.set('affid', 'YOUR_AFFILIATE_ID');
```

## Admin Access

- **Dashboard:** `/admin`
- **Create Deal:** `/admin/deals/new`
- **API Keys:** `/admin/keys`
- **API Docs:** `/admin/api-docs`
- Auth: Pass `Authorization: Bearer <ADMIN_TOKEN>` header, or use the web UI with the token.

## License

Private — All rights reserved.