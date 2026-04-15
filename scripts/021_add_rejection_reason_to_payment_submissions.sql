-- Add rejection_reason column to payment_submissions table
-- This allows admins to store the reason when rejecting an activation payment

ALTER TABLE payment_submissions 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN payment_submissions.rejection_reason IS 'Admin reason for rejecting the payment submission';
