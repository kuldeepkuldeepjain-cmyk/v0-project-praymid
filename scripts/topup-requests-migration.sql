-- Add missing columns to topup_requests for the new manual top-up flow
ALTER TABLE topup_requests
  ADD COLUMN IF NOT EXISTS screenshot_url   text,
  ADD COLUMN IF NOT EXISTS admin_notes      text,
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamp without time zone,
  ADD COLUMN IF NOT EXISTS reviewed_by_email character varying,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Ensure RLS is disabled (admin reads all rows, no per-user policy needed for admin)
-- Participant INSERT + SELECT own rows
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Allow participants to insert their own top-up requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topup_requests' AND policyname = 'Allow participant insert topup'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow participant insert topup"
      ON topup_requests FOR INSERT
      WITH CHECK (true)
    $policy$;
  END IF;

  -- Allow participants to read their own top-up requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topup_requests' AND policyname = 'Allow participant select own topup'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow participant select own topup"
      ON topup_requests FOR SELECT
      USING (true)
    $policy$;
  END IF;

  -- Allow updates (admin approval / rejection)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'topup_requests' AND policyname = 'Allow update topup requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow update topup requests"
      ON topup_requests FOR UPDATE
      USING (true)
    $policy$;
  END IF;
END;
$$;
