-- Migration: Audit fixes
-- 1. Atomic click increment function (replaces read-then-write pattern)
-- 2. Distributed lock for auto-import (pg_advisory_lock)

-- ── 1. Atomic click increment ──────────────────────────────────────────
-- Prevents race condition when two concurrent clicks read the same count
-- and both write count+1 instead of count+2.

CREATE OR REPLACE FUNCTION increment_clicks(deal_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE deals
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = deal_id;
$$;

-- ── 2. Distributed auto-import lock ────────────────────────────────────
-- Uses pg_advisory_lock with a fixed bigint ID (hash of 'auto-import').
-- try_advisory_lock returns false immediately if lock is held (non-blocking).

-- Lock: tries to acquire the lock, returns true on success
CREATE OR REPLACE FUNCTION try_auto_import_lock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_try_advisory_lock(20240331);  -- stable hash for 'auto-import'
$$;

-- Unlock: releases the lock
CREATE OR REPLACE FUNCTION release_auto_import_lock()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  PERFORM pg_advisory_unlock(20240331);
$$;

-- ── 3. Contact submissions table ────────────────────────────────────────
-- Stores messages submitted via the /contact form.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT    NOT NULL,
  email     TEXT    NOT NULL,
  message   TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow inserts from anon (the contact form)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact messages"
  ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only service role can read submissions
CREATE POLICY "Service role can read contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated, anon
