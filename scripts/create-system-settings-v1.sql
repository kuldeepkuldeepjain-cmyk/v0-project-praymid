-- Create system_settings table for admin configurations
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default topup address
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('topup_crypto_address', 'TXB7kuDqHwLxZ9eMN7r2YyQfEiHD3FGQaV', 'USDT BEP20 address for wallet topups')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all to read settings
CREATE POLICY system_settings_select_all ON system_settings FOR SELECT USING (true);

-- Allow admins to update (you can customize this later)
CREATE POLICY system_settings_update_admin ON system_settings FOR UPDATE USING (true);
