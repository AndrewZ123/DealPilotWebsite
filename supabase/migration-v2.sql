-- ============================================================
-- DealPilot — Add sourceUrl column for auto-import deduplication
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE deals ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;

-- Index for fast deduplication lookups
CREATE INDEX IF NOT EXISTS idx_deals_source_url ON deals ("sourceUrl") WHERE "sourceUrl" IS NOT NULL;