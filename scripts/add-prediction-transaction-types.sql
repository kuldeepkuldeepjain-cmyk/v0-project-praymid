-- Add prediction transaction types to the transactions table check constraint
-- First, drop the existing constraint and recreate with new types

DO $$
BEGIN
  -- Try to drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_type_check'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
  END IF;
END $$;

-- Add new constraint with all valid transaction types including prediction types
ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN (
  'credit',
  'debit',
  'contribution',
  'contribution_redirect',
  'payout_completed',
  'payout_rejected',
  'referral_reward',
  'spin_cost',
  'spin_win',
  'prediction_bet',
  'prediction_win',
  'prediction_loss',
  'activation_fee',
  'withdrawal'
));

-- Verify the constraint was added
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'transactions_type_check';
