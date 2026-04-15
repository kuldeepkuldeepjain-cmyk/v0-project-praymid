-- Add timestamps to all tables if they don't exist
-- Run this migration to ensure all tables have created_at and updated_at columns

-- Participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Payment submissions
ALTER TABLE payment_submissions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Payout requests
ALTER TABLE payout_requests
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Predictions
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Support tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Mobile verification OTPs
ALTER TABLE mobile_verification_otps
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Activity logs
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Topup requests
ALTER TABLE topup_requests
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_participants_timestamp
BEFORE UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_transactions_timestamp
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_payment_submissions_timestamp
BEFORE UPDATE ON payment_submissions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_payout_requests_timestamp
BEFORE UPDATE ON payout_requests
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_predictions_timestamp
BEFORE UPDATE ON predictions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_support_tickets_timestamp
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_mobile_verification_otps_timestamp
BEFORE UPDATE ON mobile_verification_otps
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_notifications_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_activity_logs_timestamp
BEFORE UPDATE ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_topup_requests_timestamp
BEFORE UPDATE ON topup_requests
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
