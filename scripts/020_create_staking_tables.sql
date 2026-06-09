-- Create staking configuration table for coins and APY
CREATE TABLE IF NOT EXISTS staking_coins (
  id SERIAL PRIMARY KEY,
  coin_symbol VARCHAR(10) NOT NULL UNIQUE,
  coin_name VARCHAR(50) NOT NULL,
  apy DECIMAL(5, 2) NOT NULL DEFAULT 8,
  risk_level VARCHAR(20) DEFAULT 'Low', -- Low, Medium, High
  enabled BOOLEAN DEFAULT true,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stakes table
CREATE TABLE IF NOT EXISTS stakes (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  coin_symbol VARCHAR(10) NOT NULL REFERENCES staking_coins(coin_symbol),
  amount DECIMAL(18, 8) NOT NULL,
  apy DECIMAL(5, 2) NOT NULL,
  daily_reward DECIMAL(18, 8) NOT NULL,
  principal_locked BOOLEAN DEFAULT true,
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  maturity_date TIMESTAMP,
  last_reward_date TIMESTAMP,
  total_earned DECIMAL(18, 8) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active', -- Active, Completed, Claimed, Closed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stake rewards history table
CREATE TABLE IF NOT EXISTS stake_rewards (
  id SERIAL PRIMARY KEY,
  stake_id INTEGER NOT NULL REFERENCES stakes(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  reward_amount DECIMAL(18, 8) NOT NULL,
  credited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_id INTEGER REFERENCES transactions(id),
  status VARCHAR(20) DEFAULT 'Credited', -- Credited, Pending
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stake claims table for tracking claims
CREATE TABLE IF NOT EXISTS stake_claims (
  id SERIAL PRIMARY KEY,
  stake_id INTEGER NOT NULL REFERENCES stakes(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  claimed_amount DECIMAL(18, 8) NOT NULL,
  claim_type VARCHAR(20) NOT NULL, -- principal, rewards, both
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_id INTEGER REFERENCES transactions(id),
  status VARCHAR(20) DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakes_participant_email ON stakes(participant_email);
CREATE INDEX IF NOT EXISTS idx_stakes_status ON stakes(status);
CREATE INDEX IF NOT EXISTS idx_stakes_end_date ON stakes(end_date);
CREATE INDEX IF NOT EXISTS idx_stakes_last_reward_date ON stakes(last_reward_date);
CREATE INDEX IF NOT EXISTS idx_stake_rewards_stake_id ON stake_rewards(stake_id);
CREATE INDEX IF NOT EXISTS idx_stake_rewards_participant_email ON stake_rewards(participant_email);
CREATE INDEX IF NOT EXISTS idx_stake_claims_stake_id ON stake_claims(stake_id);

-- Insert default staking coins with APY values
INSERT INTO staking_coins (coin_symbol, coin_name, apy, risk_level) VALUES
('BTC', 'Bitcoin', 8, 'Low'),
('ETH', 'Ethereum', 9, 'Low'),
('BNB', 'Binance Coin', 10, 'Low'),
('DOGE', 'Dogecoin', 11, 'Low'),
('SOL', 'Solana', 12, 'Medium'),
('XRP', 'XRP', 13, 'Medium'),
('ADA', 'Cardano', 14, 'Medium'),
('LINK', 'Chainlink', 15, 'Medium'),
('DOT', 'Polkadot', 16, 'Medium'),
('AVAX', 'Avalanche', 17, 'Medium'),
('TRX', 'Tron', 18, 'High'),
('LTC', 'Litecoin', 19, 'High'),
('ATOM', 'Cosmos', 20, 'High'),
('MATIC', 'Polygon', 21, 'High'),
('ARB', 'Arbitrum', 22, 'High'),
('APT', 'Aptos', 23, 'High'),
('SUI', 'Sui', 24, 'High'),
('TON', 'Ton', 24, 'High'),
('FLOW', 'Flow', 25, 'High'),
('NEAR', 'Near Protocol', 25, 'High')
ON CONFLICT (coin_symbol) DO NOTHING;
