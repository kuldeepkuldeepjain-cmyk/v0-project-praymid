-- Add bep20_address column to participants table
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS bep20_address character varying;

-- Backfill from wallet_address where it looks like a BEP20 address (starts with 0x, 42 chars)
UPDATE participants
  SET bep20_address = wallet_address
  WHERE wallet_address IS NOT NULL
    AND wallet_address LIKE '0x%'
    AND LENGTH(wallet_address) = 42
    AND bep20_address IS NULL;
