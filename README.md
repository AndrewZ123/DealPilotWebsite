# DealPilot

A curated deal-aggregation site built with **Next.js 14**, **TypeScript**, **TailwindCSS**, and **Prisma + SQLite**. Designed to look like a legitimate, active deal site with affiliate tracking, auto-generated deals, and FTC-compliant disclosures.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Copy the example env file and edit if needed:

```bash
cp .env.example .env
```

The defaults work out of the box for local development:

```
DATABASE_URL="file:./dev.db"
ADMIN_TOKEN="change-me-in-production"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Set up the database

Run migrations and seed with sample deals:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the site should show a grid of sample deals.

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (Deal, ClickLog)
│   └── seed.ts              # Seed script — inserts realistic sample deals
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Home — Latest Deals grid
│   │   ├── layout.tsx                # Root layout (Header, Footer)
│   │   ├── globals.css               # Tailwind base styles
│   │   ├── deals/[slug]/page.tsx     # Deal detail page
│   │   ├── category/[slug]/page.tsx  # Category filtered view
│   │   ├── about/page.tsx            # About page
│   │   ├── disclosure/page.tsx       # Affiliate Disclosure page
│   │   ├── contact/page.tsx          # Contact page
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin deal dashboard
│   │   │   └── deals/new/page.tsx    # Create new deal form
│   │   ├── go/[slug]/route.ts        # Redirect tracker (302 → merchant)
│   │   ├── api/
│   │   │   ├── deals/route.ts        # GET public deals
│   │   │   ├── deals/[slug]/route.ts # GET single deal
│   │   │   ├── admin/deals/route.ts  # POST create deal
│   │   │   ├── admin/deals/[id]/route.ts  # PUT/DELETE deal
│   │   │   └── refresh-deals/route.ts     # Auto-generate deals
│   │   ├── sitemap.ts                # Dynamic sitemap
│   │   └── robots.ts                 # robots.txt
│   ├── components/                   # Reusable UI components
│   ├── lib/                          # Database, helpers, types
│   └── types/                        # TypeScript type definitions
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## Key Features

### Public Pages
- **Home** — paginated grid of latest deals with hero section and disclosure banner
- **Deal Detail** (`/deals/[slug]`) — full deal info, pricing, "Go to Deal" CTA, OG tags
- **Category** (`/category/[slug]`) — filtered deals by category (Tech, Home, Fashion, Toys, Misc)
- **About** — trust-building content about DealPilot
- **Affiliate Disclosure** — full FTC-style disclosure page
- **Contact** — email links + simple contact form

### Admin Interface
- **Dashboard** (`/admin`) — list all deals, archive/activate/delete
- **Create Deal** (`/admin/deals/new`) — full deal creation form
- Protected by simple bearer token (set via `ADMIN_TOKEN` env var)

### Redirect System
- All outbound links go through `/go/[slug]`
- Increments click count in the database
- 302 redirects to the merchant URL
- **To add real affiliate IDs later**, edit `src/lib/redirect.ts`

### Auto-Deal Generation
- `/api/refresh-deals` generates 3–8 new realistic mock deals
- Archives deals older than 30 days
- Can be called via cron:

**Vercel Cron** (add to `vercel.json`):
```json
{ "crons": [{ "path": "/api/refresh-deals", "schedule": "0 */6 * * *" }] }
```

**Server crontab:**
```bash
0 */6 * * * curl -s -H "Authorization: Bearer YOUR_TOKEN" https://yourdomain.com/api/refresh-deals
```

---

## How to Customize the Redirector for Real Affiliate IDs

Edit `src/lib/redirect.ts`. The `buildAffiliateUrl` function is where you inject network-specific parameters:

```typescript
// Example: Amazon Associates
if (url.includes("amazon.com")) {
  url.searchParams.set("tag", "your-amazon-tag-20");
}

// Example: CJ Affiliate
if (url.href.includes("cj.com") || store === "SomeCJMerchant") {
  url.href = `https://www.anrdoezrs.net/links/${SID}/type/dlg/${encodeURIComponent(url.href)}`;
}

// Example: Impact Radius
if (store === "ImpactMerchant") {
  url.searchParams.set("subId1", "dealpilot");
  url.href = `https://your-brand.sjv.io/${AFFID}?u=${encodeURIComponent(url.href)}`;
}
```

Each network has its own link format — you can add them one at a time as you get approved.

---

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Set env vars: `DATABASE_URL`, `ADMIN_TOKEN`, `NEXT_PUBLIC_SITE_URL`
4. Deploy — Vercel runs `prisma migrate deploy` automatically if configured
5. Add Vercel Cron for auto-refresh (see `vercel.json` note above)

### Any Node.js host
```bash
npm run build
npm start
```

Make sure to run `npx prisma migrate deploy` before starting the app.

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Framework  | Next.js 14 (App Router) |
| Language   | TypeScript              |
| Styling    | TailwindCSS             |
| Database   | SQLite via Prisma ORM   |
| Deployment | Vercel / any Node host  |

---

## License

Private project. All rights reserved.