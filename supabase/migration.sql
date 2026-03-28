-- ============================================================
-- DealPilot — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── DEALS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  store         TEXT NOT NULL,
  "originalPrice"  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "salePrice"      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'misc',
  "imageUrl"    TEXT NOT NULL DEFAULT '',
  "finalUrl"    TEXT NOT NULL DEFAULT '',
  clicks        INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals (active);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals (category);
CREATE INDEX IF NOT EXISTS idx_deals_slug ON deals (slug);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals ("createdAt" DESC);

-- ── CLICK LOGS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS click_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealId"    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  referer     TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_deal ON click_logs ("dealId");
CREATE INDEX IF NOT EXISTS idx_clicks_created ON click_logs ("createdAt" DESC);

-- ── API KEYS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  key         TEXT UNIQUE NOT NULL,
  prefix      TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys (active);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ── DEALS RLS POLICIES ──
-- Public: anyone can read active deals (needed for homepage, deal detail, etc.)
CREATE POLICY "Public can view active deals"
  ON deals FOR SELECT
  USING (active = true);

-- Service role: full access (used server-side with service_role key)
-- (Service role bypasses RLS by default, so no policy needed.)

-- ── CLICK LOGS RLS POLICIES ──
-- No public read access to click logs
-- Service role bypasses RLS automatically

-- ── API KEYS RLS POLICIES ──
-- No public access to API keys at all
-- Service role bypasses RLS automatically

-- ── HELPER: auto-update "updatedAt" timestamp ────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();