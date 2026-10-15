CREATE TABLE IF NOT EXISTS registration_email_verifications (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  verification_code CHAR(6) NOT NULL,
  registration_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registration_email_verifications_email_idx
  ON registration_email_verifications (LOWER(email));
CREATE INDEX IF NOT EXISTS registration_email_verifications_expiry_idx
  ON registration_email_verifications (expires_at);
