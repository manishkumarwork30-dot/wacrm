-- ============================================================
-- Active Numbers Feature — Number Check Jobs & Results
-- Idempotent migration — safe to run multiple times.
-- ============================================================

-- ============================================================
-- NUMBER_CHECK_JOBS
-- Tracks a bulk number-checking batch.
-- ============================================================
CREATE TABLE IF NOT EXISTS number_check_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_count INTEGER NOT NULL DEFAULT 0,
  checked_count INTEGER NOT NULL DEFAULT 0,
  active_count INTEGER NOT NULL DEFAULT 0,
  dnd_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_number_check_jobs_user_id
  ON number_check_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_number_check_jobs_status
  ON number_check_jobs(status);

ALTER TABLE number_check_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own check jobs" ON number_check_jobs;
CREATE POLICY "Users can manage own check jobs" ON number_check_jobs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- NUMBER_CHECK_RESULTS
-- Individual number results within a job.
-- ============================================================
CREATE TABLE IF NOT EXISTS number_check_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES number_check_jobs(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  whatsapp_active BOOLEAN,   -- NULL = not checked yet
  dnd_status BOOLEAN,        -- NULL = unknown / not checked
  checked_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_number_check_results_job_id
  ON number_check_results(job_id);

CREATE INDEX IF NOT EXISTS idx_number_check_results_job_checked
  ON number_check_results(job_id, checked_at)
  WHERE checked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_number_check_results_phone
  ON number_check_results(phone);

ALTER TABLE number_check_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own check results" ON number_check_results;
CREATE POLICY "Users can manage own check results" ON number_check_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM number_check_jobs
      WHERE number_check_jobs.id = number_check_results.job_id
        AND number_check_jobs.user_id = auth.uid()
    )
  );

-- Service role needs unrestricted access for batch processing
DROP POLICY IF EXISTS "Service role can insert check results" ON number_check_results;
CREATE POLICY "Service role can insert check results" ON number_check_results
  FOR INSERT WITH CHECK (true);
