-- ============================================================
-- DealPilot — pg_cron + pg_net for reliable auto-import scheduling
-- ============================================================
--
-- PREREQUISITES (do these in Supabase Dashboard first):
--   1. Go to Database → Extensions
--   2. Enable "pg_cron" extension (if not already enabled)
--   3. Enable "pg_net" extension (if not already enabled)
--
-- THEN run this ENTIRE script in the Supabase SQL Editor.
--
-- This runs auto-import every 15 minutes from inside Supabase itself.
-- Combined with cron-job.org and GitHub Actions for triple redundancy.
-- The concurrency guard in /api/auto-import prevents overlapping runs.
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
  -- Fire the HTTP GET request (token auth via query param)
  SELECT INTO request_id net.http_get(
    url := 'https://www.dealpilot.org/api/auto-import?token=Andrew1017'
  );

  -- Wait for the response (up to 120 seconds for LLM processing)
  SELECT INTO status_code, response_body
    status_code, content
  FROM net._http_response
  WHERE id = request_id;

  -- Log result (check via Supabase Dashboard → Logs → Postgres Logs)
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

-- ── Step 3: Verify the job is scheduled ──
-- Run this separately to check:
-- SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'auto-import-deals';

-- ── To view recent run history: ──
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-import-deals') ORDER BY start_time DESC LIMIT 10;

-- ── To unschedule later: ──
-- SELECT cron.unschedule('auto-import-deals');

-- ── To manually test right now: ──
-- SELECT auto_import_deals();
