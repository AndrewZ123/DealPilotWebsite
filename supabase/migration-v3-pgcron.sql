-- ============================================================
-- DealPilot — pg_cron + pg_net for reliable auto-import scheduling
-- ============================================================
--
-- PREREQUISITES (do these in Supabase Dashboard first):
--   1. Go to Database → Extensions
--   2. Enable "pg_cron" extension (if not already enabled)
--   3. Enable "pg_net" extension (if not already enabled)
--
-- THEN run this SQL in the Supabase SQL Editor.
--
-- IMPORTANT: Replace YOUR_ADMIN_TOKEN_HERE with your actual ADMIN_TOKEN
-- and YOUR_SITE_URL with https://www.dealpilot.org
-- ============================================================

-- ── Step 1: Create a secure function to call the auto-import endpoint ──

CREATE OR REPLACE FUNCTION auto_import_deals()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
  status_code integer;
  response_body text;
BEGIN
  -- Fire the HTTP GET request
  SELECT INTO request_id net.http_get(
    url := 'https://www.dealpilot.org/api/auto-import?token=YOUR_ADMIN_TOKEN_HERE'
  );

  -- Wait for the response (up to 120 seconds for LLM processing)
  SELECT INTO status_code, response_body
    status_code, content
  FROM net._http_response
  WHERE id = request_id;

  -- Log result to Postgres (optional — check via Supabase Dashboard → Logs)
  RAISE NOTICE 'Auto-import response: status=%, body=%', status_code, LEFT(response_body, 200);
END;
$$;

-- ── Step 2: Schedule the cron job (every 15 minutes) ──

-- Remove existing job if re-running this migration
SELECT cron.unschedule('auto-import-deals') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-import-deals'
);

-- Schedule: every 15 minutes
SELECT cron.schedule(
  'auto-import-deals',    -- job name
  '*/15 * * * *',         -- cron expression: every 15 minutes
  $$SELECT auto_import_deals();$$
);

-- ── Step 3 (Optional): Verify the job is scheduled ──
-- Run this separately to check:
-- SELECT * FROM cron.job WHERE jobname = 'auto-import-deals';

-- ── To unschedule later: ──
-- SELECT cron.unschedule('auto-import-deals');

-- ── To manually test right now: ──
-- SELECT auto_import_deals();