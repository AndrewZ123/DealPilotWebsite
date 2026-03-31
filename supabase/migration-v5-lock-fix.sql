-- ============================================================
-- Migration v5: Replace pg_advisory_lock with auto-expiring lock table
-- ============================================================
--
-- PROBLEM: pg_advisory_lock survives Vercel serverless function crashes/timeouts.
-- When the function dies before the `finally` block runs, the lock stays held
-- indefinitely because Supabase's connection pooler keeps the session alive.
-- Result: ALL future runs get "Skipped — another import is already in progress".
--
-- SOLUTION: Use a regular table with a timestamp. If the lock is older than
-- LOCK_TIMEOUT_MINUTES, it's considered stale and can be overridden.
-- This is the standard pattern for distributed locking in serverless environments.
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================

-- ── Step 1: Create the lock table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_import_lock (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
  locked_at   TIMESTAMPTZ,
  locked_by   TEXT DEFAULT 'unknown'
);

-- Ensure exactly one row exists
INSERT INTO auto_import_lock (id, locked_at, locked_by)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Replace try_auto_import_lock with time-based version ───────
-- Attempts to acquire the lock. Returns true if successful.
-- If the lock is older than 5 minutes, it's considered stale (crashed worker)
-- and is forcefully taken over.

CREATE OR REPLACE FUNCTION try_auto_import_lock(worker_name TEXT DEFAULT 'default')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_at TIMESTAMPTZ;
  v_locked_by TEXT;
  LOCK_TIMEOUT INTERVAL := INTERVAL '5 minutes';
BEGIN
  -- Read current lock state
  SELECT locked_at, locked_by INTO v_locked_at, v_locked_by
  FROM auto_import_lock WHERE id = 1;

  -- If lock is not held, acquire it
  IF v_locked_at IS NULL THEN
    UPDATE auto_import_lock
    SET locked_at = now(), locked_by = worker_name
    WHERE id = 1;
    RETURN true;
  END IF;

  -- If lock is stale (older than timeout), forcefully take over
  IF (now() - v_locked_at) > LOCK_TIMEOUT THEN
    RAISE NOTICE 'Overriding stale lock held by % since %', v_locked_by, v_locked_at;
    UPDATE auto_import_lock
    SET locked_at = now(), locked_by = worker_name
    WHERE id = 1;
    RETURN true;
  END IF;

  -- Lock is actively held by another worker
  RETURN false;
END;
$$;

-- ── Step 3: Replace release_auto_import_lock ───────────────────────────

CREATE OR REPLACE FUNCTION release_auto_import_lock()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE auto_import_lock SET locked_at = NULL, locked_by = NULL WHERE id = 1;
$$;

-- ── Step 4: IMMEDIATE FIX — Clear any currently stuck lock ─────────────
-- This releases the stuck pg_advisory_lock AND clears the new table lock

-- Release the old advisory lock (id 20240331) in case it's still held
SELECT pg_advisory_unlock(20240331);

-- Ensure table lock is clear
SELECT release_auto_import_lock();

-- ── Step 5: Verify ─────────────────────────────────────────────────────
-- Run this to check lock status:
-- SELECT * FROM auto_import_lock;