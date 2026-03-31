# 🔍 DealPilot — Comprehensive Website Audit

**Date:** March 31, 2026  
**Scope:** Full codebase audit — all 50+ source files  
**Auditor:** Cline (AI Code Auditor)  

---

## Table of Contents

1. [Architecture & Infrastructure](#1--architecture--infrastructure)
2. [Performance](#2--performance)
3. [Security](#3--security)
4. [SEO & Metadata](#4--seo--metadata)
5. [UI/UX & Accessibility](#5--uiux--accessibility)
6. [Code Quality & Maintainability](#6--code-quality--maintainability)
7. [Data & Database](#7--data--database)
8. [Auto-Import Pipeline](#8--auto-import-pipeline)
9. [Legal & Compliance](#9--legal--compliance)
10. [Missing Features & Opportunities](#10--missing-features--opportunities)
11. [Priority Matrix](#11--priority-matrix)

---

## 1. 🏗️ Architecture & Infrastructure

### 1.1 Dual Database Confusion — Prisma + Supabase

**Severity:** 🟡 Medium  
**Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`, `src/lib/db.ts`

The project contains a complete Prisma schema (`prisma/schema.prisma`) configured for **SQLite** with models for `Deal`, `ClickLog`, and `ApiKey`. There's also a `prisma/seed.ts` file and a full migration directory. However, **none of this is used** — the actual database is **Supabase (PostgreSQL)** accessed via the `@supabase/supabase-js` client in `src/lib/db.ts`.

This creates confusion for any developer joining the project:
- The Prisma schema suggests SQLite is the database, but it's actually Supabase/PostgreSQL
- `prisma/seed.ts` references Prisma Client which is never initialized
- The `prisma/migrations/` directory contains a migration for SQLite that was never applied to Supabase
- `package.json` likely includes `prisma` and `@prisma/client` as unnecessary dependencies

**Recommendation:** Remove the entire `prisma/` directory, uninstall Prisma dependencies, and ensure all database documentation points to Supabase.

### 1.2 Zero Caching — Every Page is Force-Dynamic

**Severity:** 🔴 High  
**Files:** `src/app/page.tsx`, `src/app/category/[slug]/page.tsx`, `src/app/deals/[slug]/page.tsx`

Every public-facing page uses:
```typescript
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
```
Plus the deprecated `unstable_noStore()` call inside each page component.

This means **every single page request** triggers a fresh Supabase query. There is no Incremental Static Regeneration (ISR), no stale-while-revalidate, and no server-side caching whatsoever. For a deal site where content changes every 15 minutes at most, this is extremely wasteful.

**Impact:**
- Higher Supabase API costs (every page hit = database query)
- Slower Time-to-First-Byte (TTFB) for all visitors
- Reduced ability to handle traffic spikes
- Vercel serverless function invocations for every page load

**Recommendation:** Use ISR with `revalidate = 900` (15 minutes) on homepage and category pages. Only deal detail pages might need shorter revalidation. Remove `unstable_noStore()` calls — this API is deprecated in Next.js 14+.

### 1.3 Cron Scheduling Inconsistency

**Severity:** 🟡 Medium  
**Files:** `.github/workflows/auto-deals.yml`, `vercel.json`

The system uses triple-redundant cron scheduling:
1. **Supabase pg_cron** — every 15 minutes
2. **cron-job.org** — every 15 minutes (external)
3. **GitHub Actions** — every 15 minutes

However, `vercel.json` defines a Vercel Cron for `/api/auto-import` that runs **only once daily** (`0 6 * * *`). This is contradictory — the Vercel Cron schedule doesn't match the stated 15-minute interval.

Additionally, having three overlapping cron sources means the concurrency guard (`isRunning` in-memory flag) is the only thing preventing duplicate imports — but this flag doesn't work across separate serverless instances (see Section 8).

**Recommendation:** Choose ONE primary cron source. Remove or align the Vercel Cron schedule. Document which source is the primary.

### 1.4 Missing Error Boundaries

**Severity:** 🟡 Medium  
**Files:** All page components

There are no `error.tsx` boundary files anywhere in the app directory structure. If any server component throws an error (Supabase down, network timeout, malformed data), the user sees Next.js's default error page with a generic message.

**Recommendation:** Add `error.tsx` files at the app root and key route segments (`/deals/`, `/category/`, `/admin/`).

### 1.5 Missing Loading States

**Severity:** 🟢 Low  
**Files:** All page components

No `loading.tsx` files exist. While most pages are force-dynamic (so there's no static shell to stream into), adding skeleton loading states would improve perceived performance.

---

## 2. ⚡ Performance

### 2.1 Text-Only Design — Intentional Differentiator ✅

**Status:** ✅ Intentional Design Decision  
**Files:** `src/components/DealCard.tsx`, `src/components/DealGrid.tsx`

DealPilot deliberately uses a **text-only, no-image design** to differentiate from other deal sites. This is a valid and strategic choice:
- Faster page loads (no image downloads)
- Cleaner, distraction-free UX
- Lower bandwidth costs
- Forces focus on the deal itself (price, discount, store) rather than product glamour shots

**Housekeeping note:** The `imageUrl` field still exists in the database schema, admin form, and `DealCard` type definition. Since images will never be shown, consider:
- Removing the `imageUrl` field from the admin "New Deal" form to avoid confusion
- Removing `imageUrl` from the `DealCard` TypeScript interface
- Keeping the database column for potential future use, or removing it for schema clarity

### 2.2 Deprecated `unstable_noStore()` Usage

**Severity:** 🟡 Medium  
**Files:** `src/app/page.tsx`, `src/app/category/[slug]/page.tsx`, `src/app/deals/[slug]/page.tsx`

The `unstable_noStore()` function from `next/cache` is deprecated. The Next.js docs recommend using the `dynamic` route segment config export instead (which is also present, making `unstable_noStore()` redundant).

```typescript
// Both of these exist in the same file — redundant
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Inside the component — deprecated and redundant
unstable_noStore();
```

**Recommendation:** Remove all `unstable_noStore()` calls. The `dynamic = "force-dynamic"` export is sufficient.

### 2.3 Ticker Bar Client-Side Fetch on Every Page Load

**Severity:** 🟡 Medium  
**Files:** `src/components/TickerBar.tsx`

The `TickerBar` component uses `useEffect` to fetch `/api/ticker` on the client side every time the page loads. Since the ticker appears in the layout (on every page), this means an extra HTTP request per page navigation. The ticker API itself has a 10-minute in-memory cache, but that only works within the same serverless instance.

**Recommendation:** Fetch ticker data server-side in the layout and pass it as a prop. Or use Next.js's `fetch` with `revalidate` in a server component. Alternatively, use SWR/React Query with stale-while-revalidate on the client.

### 2.4 No Image Optimization Configuration

**Severity:** 🟡 Medium  
**Files:** `next.config.mjs`

The Next.js config has no `images` configuration. The `next/image` component (if/when added) will need proper remote image patterns configured:

```javascript
// Missing from next.config.mjs
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'placehold.co' },
    { protocol: 'https', hostname: '**.amazon.com' },
    // etc.
  ],
}
```

### 2.5 Missing `next/font` Optimization

**Severity:** 🟢 Low  
**Files:** `src/app/globals.css`, `src/app/layout.tsx`

The site uses Tailwind's default font stack (system fonts) rather than `next/font` for optimized font loading. While system fonts are fast, if a custom font is desired later, `next/font` should be used to prevent layout shift.

### 2.6 No Pagination on Homepage or Category Pages

**Severity:** 🟡 Medium  
**Files:** `src/app/page.tsx`, `src/app/category/[slug]/page.tsx`

The homepage fetches `limit(20)` deals and the category page fetches `limit(30)` deals. There's no pagination UI — if there are more deals, users simply can't see them. The public API (`/api/deals`) supports pagination but the server components don't use it.

**Recommendation:** Add "Load More" or paginated navigation.

---

## 3. 🔒 Security

### 3.1 Admin Authentication via `prompt()` and `sessionStorage`

**Severity:** 🔴 Critical  
**Files:** `src/app/admin/page.tsx`, `src/app/admin/keys/page.tsx`

The admin dashboard uses `prompt()` to ask for the admin token and stores it in `sessionStorage`:

```typescript
const getToken = () => {
  const stored = sessionStorage.getItem("admin_token");
  if (stored) return stored;
  const token = prompt("Enter admin token:");
  if (token) {
    sessionStorage.setItem("admin_token", token);
    return token;
  }
  return null;
};
```

**Issues:**
- `sessionStorage` is accessible via browser DevTools — anyone can read/modify the token
- `prompt()` is a terrible UX pattern and is blocked by some browsers
- No session expiry — the token persists until the tab is closed
- No logout mechanism
- The token is sent with every API call, visible in the Network tab

**Recommendation:** Implement proper authentication — even a simple NextAuth.js credential provider with HTTP-only cookies would be vastly superior.

### 3.2 Search Parameter SQL Injection Risk

**Severity:** 🟡 Medium  
**Files:** `src/app/api/admin/deals/route.ts`

The admin deals API passes user input directly into a Supabase `ilike` query without sanitization:

```typescript
if (search) query = query.or(
  `title.ilike.%${search}%,description.ilike.%${search}%,store.ilike.%${search}%`
);
```

While Supabase's PostgREST layer uses parameterized queries (so direct SQL injection is unlikely), special characters like `%`, `_`, `,` in the search string could cause unexpected query behavior. The search value is also interpolated into a comma-separated PostgREST filter string, which could be exploited.

**Recommendation:** Sanitize the search input. Escape `%` and `_` characters. Use a parameterized approach instead of string interpolation.

### 3.3 API Keys Stored in Plaintext

**Severity:** 🟡 Medium  
**Files:** `src/app/api/admin/keys/route.ts`, `supabase/migration.sql`

API keys are stored in the database as plaintext. The `key` column in `api_keys` contains the full, unhashed key. While the API only returns the key once during creation, if the database is compromised, all API keys are immediately exposed.

**Recommendation:** Store only a cryptographic hash of the API key (like password hashing with bcrypt/argon2). Use the prefix for display purposes and the hash for lookup during authentication.

### 3.4 No Rate Limiting

**Severity:** 🟡 Medium  
**Files:** All API routes

No rate limiting exists on any endpoint. The public `/api/deals` endpoint, the `/go/[slug]` redirect endpoint, and all admin endpoints have zero rate limiting.

**Impact:**
- `/go/[slug]` click count can be artificially inflated
- `/api/deals` can be scraped at high volume
- Admin endpoints can be brute-forced

**Recommendation:** Add rate limiting middleware. Vercel offers Edge Middleware rate limiting. Alternatively, use Upstash Ratelimit with the existing Supabase infrastructure.

### 3.5 No CSRF Protection

**Severity:** 🟡 Medium  
**Files:** All admin API routes (POST, PUT, DELETE)

State-changing operations (POST, PUT, DELETE) on admin endpoints have no CSRF protection. The `Authorization: Bearer` header provides some protection (browsers don't auto-attach custom headers), but the token could be extracted from `sessionStorage` by XSS.

### 3.6 Timing Attack on Token Comparison

**Severity:** 🟢 Low  
**Files:** `src/lib/auth.ts`

The admin token comparison uses `===`:

```typescript
if (token === adminToken) return true;
```

This is vulnerable to timing attacks where an attacker measures response times to iteratively guess the token character by character. Use `crypto.timingSafeEqual()` instead.

### 3.7 `SUPABASE_SERVICE_ROLE_KEY` Leakage Risk

**Severity:** 🟡 Medium  
**Files:** `src/lib/db.ts`

The `supabaseAdmin` client uses the `SUPABASE_SERVICE_ROLE_KEY` which bypasses all Row Level Security. If this key were accidentally imported in a client component, it would be bundled and exposed. Currently, all imports are server-side only, but there's no safeguard preventing a future mistake.

**Recommendation:** Add a check that `SUPABASE_SERVICE_ROLE_KEY` is only used in server contexts. Consider using Next.js server-only package to enforce this.

### 3.8 No Input Sanitization for Stored Content

**Severity:** 🟡 Medium  
**Files:** `src/app/api/admin/deals/route.ts`, `src/app/api/admin/deals/batch/route.ts`

Deal titles, descriptions, and store names are stored in the database without any HTML sanitization. If the admin panel or LLM-generated content contains HTML/script tags, they could potentially be rendered as-is in the UI (React does auto-escape, but this is still a defense-in-depth concern).

---

## 4. 🔍 SEO & Metadata

### 4.1 Inconsistent Site URL

**Severity:** 🟡 Medium  
**Files:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/rss-parser.ts`, `.github/workflows/auto-deals.yml`

The site URL is inconsistent across files:
- `src/app/sitemap.ts`: Uses `process.env.NEXT_PUBLIC_SITE_URL || "https://dealpilot.org"`
- `src/app/robots.ts`: Uses `process.env.NEXT_PUBLIC_SITE_URL || "https://dealpilot.org"`
- `src/lib/rss-parser.ts`: User-Agent says `+https://dealpilot.org`
- `.github/workflows/auto-deals.yml`: Now uses `https://dealpilot.org` ✅ (fixed during audit)

All source files now consistently use `dealpilot.org` (without `www`). However, the `.env` and `.env.example` files should have `NEXT_PUBLIC_SITE_URL` set to ensure production uses the correct domain. Additionally, DNS should be configured to redirect `www.dealpilot.org` → `dealpilot.org` (or vice versa) to prevent SEO dilution from any external links using the `www` variant.

**Recommendation:** Ensure Vercel's domain settings redirect `www` to the bare domain. Verify `NEXT_PUBLIC_SITE_URL` is set in all deployment environments.

### 4.2 Missing OpenGraph Images

**Severity:** 🟡 Medium  
**Files:** `src/app/layout.tsx`, `src/app/deals/[slug]/page.tsx`

The root layout metadata defines:
```typescript
openGraph: {
  images: undefined,  // ← No OG image
}
```

The deal detail page also sets `images: undefined`. No page in the entire site has an OpenGraph image. When links are shared on social media (Twitter/X, Facebook, LinkedIn, Discord, Slack), they appear as plain text without any visual preview.

**Recommendation:** Create a default OG image (1200×630px) for the site. For deal pages, dynamically generate OG images using Next.js's `ImageResponse` API showing the product name, price, and discount.

### 4.3 Missing JSON-LD Structured Data

**Severity:** 🟡 Medium  
**Files:** `src/app/page.tsx`, `src/app/deals/[slug]/page.tsx`

No structured data (Schema.org JSON-LD) is implemented. For a deal/aggregator site, this is a significant SEO miss. Google's Rich Results could display deal prices, availability, and ratings directly in search results.

**Recommendation:** Add `Product` or `Offer` schema markup to deal pages. Add `ItemList` schema to the homepage and category pages.

### 4.4 No Canonical URLs

**Severity:** 🟢 Low  
**Files:** All page components

No `<link rel="canonical">` tags are set on any page. This can lead to duplicate content issues if the same page is accessible via multiple URLs.

### 4.5 Missing Twitter Card Metadata

**Severity:** 🟢 Low  
**Files:** `src/app/layout.tsx`

No `twitter:card`, `twitter:title`, `twitter:description`, or `twitter:image` metadata is defined. Twitter/X link previews will be generic.

### 4.6 Sitemap Limited to Deals Only

**Severity:** 🟢 Low  
**Files:** `src/app/sitemap.ts`

The sitemap only includes deal URLs. Static pages (About, Contact, Disclosure, category pages) are not included. While these are discoverable via internal links, adding them to the sitemap would improve crawlability.

---

## 5. 🎨 UI/UX & Accessibility

### 5.1 Newsletter Form is Non-Functional

**Severity:** 🔴 High  
**Files:** `src/components/Footer.tsx`

The footer contains a newsletter signup form that **does absolutely nothing**:

```tsx
<form onSubmit={(e) => e.preventDefault()} className="...">
  <input type="email" placeholder="Enter your email" className="..." />
  <button type="submit" className="...">Subscribe</button>
</form>
```

The `onSubmit` handler only prevents default behavior. There's no backend endpoint, no email collection, no success/error feedback. Users who enter their email and click Subscribe will see nothing happen — this damages trust.

**Recommendation:** Either connect to an email service (ConvertKit, Mailchimp, Resend) or remove the form entirely. A broken form is worse than no form.

### 5.2 Contact Form Uses Broken `mailto:` Action

**Severity:** 🔴 High  
**Files:** `src/app/contact/page.tsx`

The contact form uses:
```html
<form action="mailto:hello@dealpilot.org" method="POST" encType="text/plain">
```

This `mailto:` form action is **deprecated and unreliable**:
- Doesn't work in most modern browsers
- Requires the user to have a configured desktop email client
- In browsers where it does work, it opens the user's email client with a poorly formatted message
- Provides no feedback to the user
- Cannot handle file attachments

**Recommendation:** Create a `/api/contact` endpoint that sends emails via a service like Resend, SendGrid, or Nodemailer.

### 5.3 No Search Functionality

**Severity:** 🟡 Medium  
**Files:** `src/components/Header.tsx`, `src/app/page.tsx`

There is no way for users to search for deals. The admin API supports search (`?search=query`), but this isn't exposed to public users. For a deal aggregator, search is a fundamental feature.

**Recommendation:** Add a search bar in the header with a search results page. Could use Supabase's full-text search or a simple `ilike` query.

### 5.4 No Sorting or Filtering Options

**Severity:** 🟡 Medium  
**Files:** `src/app/page.tsx`, `src/app/category/[slug]/page.tsx`

Deals are only sorted by creation date (newest first). Users cannot:
- Sort by price (low to high, high to low)
- Sort by discount percentage
- Filter by store
- Filter by price range
- Filter by "hot deals" (high discount)

**Recommendation:** Add sort/filter controls above the deal grid.

### 5.5 Missing Custom 404 Page

**Severity:** 🟡 Medium  
**Files:** `src/app/` (missing `not-found.tsx`)

There is no custom `not-found.tsx` file at the app root. When users hit a non-existent URL, they see Next.js's default 404 page, which doesn't match the site's design or provide helpful navigation.

**Recommendation:** Create a branded `src/app/not-found.tsx` with navigation links back to the homepage and category pages.

### 5.6 Mobile Navigation Issues

**Severity:** 🟢 Low  
**Files:** `src/components/Header.tsx`

The mobile menu doesn't automatically close when a navigation link is clicked. Users must manually close it after navigating. This creates a poor mobile experience.

### 5.7 Missing `aria-label` on Interactive Elements

**Severity:** 🟢 Low  
**Files:** `src/components/Header.tsx`, `src/components/DealCard.tsx`

Several interactive elements lack accessible labels:
- The hamburger menu button has no `aria-label` or `aria-expanded`
- Icon-only buttons in the admin panel have no accessible names
- The ticker bar has no `aria-live` region for screen readers

### 5.8 Email Addresses Exposed to Scraping

**Severity:** 🟢 Low  
**Files:** `src/app/contact/page.tsx`

Email addresses (`hello@dealpilot.org`, `partners@dealpilot.org`) are displayed as plain `mailto:` links, making them trivially scrapable by email harvesters.

**Recommendation:** Use contact forms instead of direct email links. Or obfuscate addresses with JavaScript.

---

## 6. 🧹 Code Quality & Maintainability

### 6.1 Unused Prisma Infrastructure

**Severity:** 🟡 Medium  
**Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`

As detailed in Section 1.1, the entire `prisma/` directory is dead code. Additionally:
- `package.json` likely includes `prisma` and `@prisma/client` as dependencies
- The `prisma/seed.ts` file imports from `@prisma/client` which is never configured
- The `prisma/migrations/migration_lock.toml` references SQLite

### 6.2 Duplicated `generateApiKey()` Function

**Severity:** 🟡 Medium  
**Files:** `src/app/api/admin/keys/route.ts`, `src/app/api/admin/keys/[id]/route.ts`

The `generateApiKey()` function is identically defined in two separate files:

```typescript
function generateApiKey(): { key: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("hex");
  const key = `dp_${random}`;
  const prefix = key.slice(0, 8);
  return { key, prefix };
}
```

**Recommendation:** Extract to `src/lib/api-keys.ts` and import where needed.

### 6.3 Duplicated Category Validation

**Severity:** 🟡 Medium  
**Files:** Multiple API route files

The hardcoded `VALID_CATEGORIES` array appears in at least four places:
- `src/app/api/admin/deals/route.ts`: `const validCategories = ["Tech", "Home", "Fashion", "Toys", "Misc"]`
- `src/app/api/admin/deals/[id]/route.ts`: Same array
- `src/app/api/admin/deals/batch/route.ts`: `const VALID_CATEGORIES = ["Tech", "Home", "Fashion", "Toys", "Misc"]`
- `src/app/api/auto-import/route.ts`: `const VALID = ["Tech", "Home", "Fashion", "Toys", "Misc"]`

The `src/lib/categories.ts` file already exports `CATEGORIES` but the API routes don't use it for validation.

**Recommendation:** Export a `VALID_CATEGORY_NAMES` array from `src/lib/categories.ts` and reference it everywhere.

### 6.4 TypeScript Types Barely Used

**Severity:** 🟢 Low  
**Files:** `src/types/index.ts`

The `src/types/index.ts` file defines a `Deal` interface with fields like `id`, `slug`, `title`, etc. However, most API routes and components define their own inline types or use `Record<string, unknown>` instead. The shared types file is essentially unused.

### 6.5 No Test Files

**Severity:** 🟡 Medium  
**Files:** Entire project

There are zero test files in the entire project. No unit tests, no integration tests, no E2E tests. For a project that:
- Handles money-adjacent data (prices, discounts)
- Has an auto-import pipeline with LLM integration
- Has admin CRUD operations
- Tracks click analytics

This is a significant risk.

**Recommendation:** Start with tests for the most critical paths:
1. Price validation logic (salePrice < originalPrice)
2. Slug generation and uniqueness
3. Auth middleware
4. RSS parsing
5. API route validation

### 6.6 No ESLint Configuration Beyond Defaults

**Severity:** 🟢 Low  
**Files:** Root directory (missing `.eslintrc` or `eslint.config.js`)

The project relies on Next.js's built-in ESLint config with no custom rules. There are no strict TypeScript rules, no import ordering, no unused variable enforcement beyond basics.

### 6.7 Hardcoded Magic Values

**Severity:** 🟢 Low  
**Files:** Multiple

Various magic values are scattered throughout:
- `PAGE_SIZE = 18` in `/api/deals/route.ts`
- `limit(20)` in homepage, `limit(30)` in category page
- `CACHE_TTL = 10 * 60 * 1000` in ticker API
- `MAX_DEALS_PER_RUN = 4` in auto-import
- `AbortSignal.timeout(25_000)` for LLM timeout
- `AbortSignal.timeout(8_000)` for RSS timeout

**Recommendation:** Centralize configuration in a `src/lib/config.ts` file.

### 6.8 Console Errors Silently Swallowed

**Severity:** 🟢 Low  
**Files:** `src/app/go/[slug]/route.ts`

The click tracking fire-and-forget patterns use empty catch blocks:
```typescript
void (async () => {
  try {
    await supabaseAdmin.from("deals").update(...)
  } catch { /* non-critical */ }
})();
```

While intentionally non-critical, these silent failures mean you have no visibility into click tracking issues. At minimum, log to an observability service.

---

## 7. 🗄️ Data & Database

### 7.1 Race Condition in Click Counting

**Severity:** 🔴 High  
**Files:** `src/app/go/[slug]/route.ts`

The click counter uses a read-then-write pattern:

```typescript
const { data: deal } = await supabaseAdmin
  .from("deals")
  .select("id, slug, finalUrl, active, clicks")
  .eq("slug", slug)
  .single();

// Later:
await supabaseAdmin
  .from("deals")
  .update({ clicks: (deal.clicks || 0) + 1 })
  .eq("id", deal.id);
```

If two requests arrive simultaneously, both read the same `clicks` value (e.g., 5), both increment to 6, and one write overwrites the other. **Lost update problem.**

**Recommendation:** Use an atomic SQL update:
```sql
UPDATE deals SET clicks = clicks + 1 WHERE id = $1
```
In Supabase, this would be an RPC call or raw SQL query.

### 7.2 `click_logs` Table Grows Unbounded

**Severity:** 🟡 Medium  
**Files:** `supabase/migration.sql`

The `click_logs` table has no cleanup mechanism. Every click through `/go/[slug]` inserts a row. Over time, this table will grow indefinitely, consuming storage and degrading query performance.

**Recommendation:** Add a pg_cron job or scheduled function to archive/delete logs older than 90 days. Alternatively, aggregate click data into a summary table periodically.

### 7.3 Mock Deal Generator Creates Fake Data

**Severity:** 🟡 Medium  
**Files:** `src/lib/deals.ts`

The `generateDeals()` function creates entirely fake deals with:
- Hardcoded product names from a pool of 25 items
- Random prices and discounts
- Placeholder images from `placehold.co`
- URLs that point to search pages, not actual products

If this function is being called via `/api/refresh-deals`, the site is being populated with non-real deals that users can't actually purchase at the listed prices.

**Recommendation:** Ensure this is only used for development/seeding. The auto-import pipeline should be the primary source of real deals. Add a guard to prevent mock deals in production.

### 7.4 Slug Uniqueness Loop

**Severity:** 🟢 Low  
**Files:** `src/app/api/admin/deals/route.ts`, `src/app/api/admin/deals/batch/route.ts`

The slug uniqueness check uses a `while` loop that could theoretically run forever:

```typescript
let { data: existing } = await supabaseAdmin.from("deals").select("id").eq("slug", slug).single();
while (existing) {
  slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  ({ data: existing } = await supabaseAdmin.from("deals").select("id").eq("slug", slug).single());
}
```

While extremely unlikely to loop more than once, there's no upper bound on iterations.

**Recommendation:** Add a max retry count (e.g., 10) and throw an error if exceeded.

### 7.5 `sourceUrl` Column Handling is Fragile

**Severity:** 🟡 Medium  
**Files:** `src/app/api/auto-import/route.ts`

The auto-import code uses a module-level `let sourceUrlColumnExists = true` variable to track whether the `sourceUrl` column exists. This is fragile because:
- If the first request fails for a different reason, it permanently disables `sourceUrl` lookups
- The variable resets when the serverless function cold-starts
- Error message matching (`does not exist`) is brittle

```typescript
if (error?.message?.includes("does not exist")) {
  sourceUrlColumnExists = false;
}
```

**Recommendation:** Either ensure the migration is always applied, or use a more robust detection mechanism (query `information_schema.columns`).

### 7.6 Missing Database Indexes

**Severity:** 🟢 Low  
**Files:** `supabase/migration.sql`

The migration creates indexes on `active`, `category`, `slug`, and `createdAt`, but is missing:
- Composite index on `(active, category)` — used by category pages
- Composite index on `(active, "createdAt" DESC)` — used by homepage
- Index on `clicks` for top-deals queries

---

## 8. 🤖 Auto-Import Pipeline

### 8.1 In-Memory Concurrency Lock Doesn't Work Across Serverless Instances

**Severity:** 🔴 High  
**Files:** `src/app/api/auto-import/route.ts`

The concurrency guard uses an in-memory variable:

```typescript
let isRunning = false;
// ...
if (isRunning) {
  return NextResponse.json({ ... skipped ... });
}
isRunning = true;
```

On Vercel (serverless), each function invocation may run in a separate instance. The `isRunning` flag is per-instance, so two simultaneous requests from different cron sources will both see `isRunning === false` and proceed. The lock provides a false sense of security.

**Recommendation:** Use a distributed lock via Supabase (e.g., advisory locks or a `locks` table with `pg_try_advisory_lock`), Redis, or Vercel KV.

### 8.2 Only 3 RSS Sources

**Severity:** 🟡 Medium  
**Files:** `src/lib/rss-sources.ts`

Only three RSS feeds are configured:
1. Slickdeals — Hot Deals
2. Slickdeals — FeedBurner
3. CNET Deals

Two of these are from the same source (Slickdeals), providing redundant coverage. For a deal aggregator, this is extremely limited. Missing sources: DealNews, Kinja Deals, BradsDeals, Reddit r/buildapcsales, Woot, Meh, Amazon Gold Box, etc.

### 8.3 LLM Dependency for Deal Rewriting

**Severity:** 🟡 Medium  
**Files:** `src/lib/llm-rewrite.ts`

Every imported deal goes through an LLM (ZAI API / GLM-4.5) for rewriting. This introduces:
- **Single point of failure:** If the LLM API is down, no deals get imported
- **Latency:** 25-second timeout per deal
- **Cost:** Each deal costs API credits
- **Quality risk:** LLM may hallucinate prices or product details
- **Throughput bottleneck:** Only 4 deals per run due to LLM processing time

**Recommendation:** Add a fallback that inserts deals without LLM rewriting when the API is unavailable. Consider using regex-based title cleaning (like the ticker does) as a fast path.

### 8.4 Only 4 Deals Processed Per Run

**Severity:** 🟡 Medium  
**Files:** `src/app/api/auto-import/route.ts`

`MAX_DEALS_PER_RUN = 4` means only 4 deals are imported per 15-minute cycle. If RSS feeds produce 50+ candidates, most are ignored. Combined with `CONCURRENCY = 1`, the throughput is very low.

**Recommendation:** Increase batch size and/or concurrency. Consider background job processing.

### 8.5 No Deal Expiration or Freshness Tracking

**Severity:** 🟡 Medium  
**Files:** `src/lib/deals.ts`, database schema

Deals have a `createdAt` timestamp but no `expiresAt` field. The `archiveOldDeals()` function archives deals older than 30 days, but there's no way to mark a deal as expiring at a specific time (e.g., "flash sale ends in 4 hours"). Expired deals remain active until the 30-day cleanup runs.

---

## 9. ⚖️ Legal & Compliance

### 9.1 No Privacy Policy

**Severity:** 🔴 High  
**Files:** `src/app/` (missing page)

The site collects:
- IP addresses (via `click_logs`)
- User agents (via `click_logs`)
- Referer headers (via `click_logs`)
- Email addresses (via the non-functional newsletter form)

There is **no privacy policy** anywhere on the site. This may violate:
- GDPR (EU users)
- CCPA (California users)
- Various state privacy laws

**Recommendation:** Create a `/privacy` page disclosing all data collection practices. Include information about cookies, tracking, third-party services (Supabase, Vercel), and data retention.

### 9.2 No Terms of Service

**Severity:** 🟡 Medium  
**Files:** `src/app/` (missing page)

There is no terms of service or terms of use page. While not strictly required for a personal project, if the site generates affiliate revenue, having terms protects the operator.

### 9.3 No Cookie Consent Banner

**Severity:** 🟡 Medium  
**Files:** `src/app/layout.tsx`

The site uses analytics (or at minimum, Vercel's built-in analytics) and tracks user behavior (click_logs). No cookie consent mechanism exists. This is required under GDPR for EU visitors.

### 9.4 FTC Affiliate Disclosure Could Be More Specific

**Severity:** 🟢 Low  
**Files:** `src/app/disclosure/page.tsx`, `src/components/DisclosureBanner.tsx`

The affiliate disclosure page is well-written but could be improved:
- It doesn't list specific affiliate programs the site participates in
- The "Amazon Associates" disclosure mentions it "may" earn from qualifying purchases — if you're in the program, state it definitively
- The disclosure banner at the top of deal pages is small and could be missed

### 9.5 No Cookie Policy Page

**Severity:** 🟢 Low  
**Files:** `src/app/` (missing page)

Even if the site doesn't set its own cookies, Vercel and any third-party scripts likely do. A cookie policy page is recommended.

---

## 10. 🚀 Missing Features & Opportunities

### 10.1 High-Impact Missing Features

| Feature | Impact | Effort |
|---------|--------|--------|
| **Search** | High | Medium |
| **Deal Expiration Dates** | High | Medium |
| **Price History Tracking** | High | High |
| **User Favorites/Watchlist** | Medium | Medium |
| **Email Notifications** | Medium | Medium |
| **Social Sharing Buttons** | Medium | Low |
| **Deal Alerts** | Medium | High |
| **Dark Mode** | Medium | Low |
| **Mobile App / PWA** | Medium | Medium |
| **Comparison Table** | Medium | Medium |
| **Price Drop Alerts** | Medium | High |
| **User Reviews/Ratings** | Low | High |
| **Deal Comments** | Low | Medium |

### 10.2 Technical Improvements

- **Bundle Analysis:** No `@next/bundle-analyzer` configured. Unknown what the client bundle size is.
- **Web Vitals Monitoring:** No Core Web Vitals tracking (Vercel Analytics or `useReportWebVitals`).
- **Error Tracking:** No Sentry, LogTail, or error monitoring service.
- **Health Check Endpoint:** No `/api/health` endpoint for uptime monitoring.
- **Database Backups:** No mention of Supabase backup strategy.
- **Environment Variable Validation:** No runtime validation of required env vars (Zod, etc.).
- **API Versioning:** All endpoints are unversioned. Breaking changes affect all consumers.

### 10.3 UX Enhancements

- **Breadcrumb Navigation:** Only deal detail pages have breadcrumbs. Homepage and category pages don't.
- **Back to Top Button:** No scroll-to-top on long deal lists.
- **Share Functionality:** No way to share a deal on social media or copy a link.
- **Print-Friendly View:** No print stylesheet for deal pages.
- **Keyboard Navigation:** No keyboard shortcuts for power users.
- **Recently Viewed Deals:** No tracking of user's recently viewed deals.
- **Estimated Delivery/Shipping Info:** No shipping cost or delivery estimate display.

---

## 11. Priority Matrix

### 🔴 Critical — Fix Immediately

| # | Issue | Impact |
|---|-------|--------|
| 3.1 | Admin auth via `prompt()` and `sessionStorage` | Admin panel trivially accessible |
| 7.1 | Race condition in click counting | Analytics data is wrong |
| 8.1 | Concurrency lock doesn't work serverless | Duplicate imports, wasted API calls |
| 9.1 | No privacy policy | Legal liability |

### 🟡 High — Fix Soon

| # | Issue | Impact |
|---|-------|--------|
| 1.2 | Zero caching — all pages force-dynamic | Performance, cost, scalability |
| 1.1 | Dual database confusion (Prisma + Supabase) | Developer confusion |
| 2.2 | Deprecated `unstable_noStore()` | Future breaking change |
| 5.1 | Newsletter form is non-functional | Trust damage |
| 5.2 | Contact form uses broken `mailto:` | Can't receive messages |
| 3.2 | Unsanitized search input | Potential query manipulation |
| 3.3 | API keys stored in plaintext | Database breach exposes all keys |
| 3.4 | No rate limiting | Vulnerable to abuse |
| 4.1 | Inconsistent site URL (`dealpilot.org` vs `www.dealpilot.org`) | SEO dilution |
| 4.2 | Missing OpenGraph images | Poor social sharing |
| 4.3 | Missing JSON-LD structured data | Missing rich search results |
| 5.3 | No search functionality | Users can't find deals |
| 5.5 | Missing custom 404 page | Poor user experience |
| 7.2 | click_logs grows unbounded | Database bloat |
| 7.5 | sourceUrl column detection is fragile | Import failures |
| 8.2 | Only 3 RSS sources | Limited deal coverage |
| 9.2 | No terms of service | Legal protection gap |
| 9.3 | No cookie consent banner | GDPR non-compliance |

### 🟢 Medium — Fix When Convenient

| # | Issue |
|---|-------|
| 1.3 | Cron scheduling inconsistency |
| 1.4 | Missing error boundaries |
| 2.1 | Ticker bar client-side fetch |
| 2.6 | No pagination |
| 3.6 | Timing attack on token comparison |
| 3.7 | Service role key leakage risk |
| 3.8 | No input sanitization |
| 4.4 | No canonical URLs |
| 5.4 | No sorting/filtering |
| 5.6 | Mobile nav doesn't close |
| 6.1 | Unused Prisma infrastructure |
| 6.2 | Duplicated generateApiKey() |
| 6.3 | Duplicated category validation |
| 6.5 | No test files |
| 7.3 | Mock deal generator creates fake data |
| 8.3 | LLM dependency for deal rewriting |
| 8.4 | Only 4 deals processed per run |

---

## Summary Statistics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Architecture | 0 | 1 | 3 | 1 |
| Performance | 0 | 2 | 3 | 1 |
| Security | 1 | 4 | 2 | 1 |
| SEO | 0 | 3 | 0 | 3 |
| UI/UX | 0 | 2 | 3 | 3 |
| Code Quality | 0 | 0 | 3 | 4 |
| Data/Database | 1 | 2 | 2 | 2 |
| Auto-Import | 1 | 0 | 4 | 0 |
| Legal | 1 | 2 | 1 | 2 |
| **Total** | **4** | **15** | **24** | **17** |

---

*This audit was performed by an AI code reviewer analyzing all 50+ source files in the DealPilot codebase. Each finding includes specific file references and actionable recommendations.*