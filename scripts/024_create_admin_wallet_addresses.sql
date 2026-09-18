-- Admin-managed blockchain wallet addresses
CREATE TABLE IF NOT EXISTS admin_wallet_addresses (
  network TEXT PRIMARY KEY CHECK (network IN ('TRC20', 'ERC20')),
  address TEXT NOT NULL DEFAULT '',
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_wallet_addresses (network, address, updated_at)
SELECT 'TRC20', COALESCE(setting_value, ''), NOW()
FROM system_settings
WHERE setting_key = 'topup_trc20_address'
ON CONFLICT (network) DO NOTHING;

INSERT INTO admin_wallet_addresses (network, address, updated_at)
SELECT 'ERC20', COALESCE(setting_value, ''), NOW()
FROM system_settings
WHERE setting_key = 'topup_erc20_address'
ON CONFLICT (network) DO NOTHING;
