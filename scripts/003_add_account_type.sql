-- Adds the registration choice used by the participant account form.
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'normal';

ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_account_type_check;

ALTER TABLE participants
  ADD CONSTRAINT participants_account_type_check
  CHECK (account_type IN ('normal', 'funded'));
