-- Forex trades: unified table for open positions, pending orders, and closed trade history.
-- The `id` column stores the client-generated trade id (e.g. genId()) so the frontend
-- can keep using the same id across optimistic UI updates and server persistence.
CREATE TABLE IF NOT EXISTS forex_trades (
  id TEXT PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,

  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  lot_size NUMERIC NOT NULL,
  leverage NUMERIC NOT NULL,

  open_price NUMERIC NOT NULL,
  sl NUMERIC,
  tp NUMERIC,
  trailing_stop_pips NUMERIC,
  trailing_peak NUMERIC,
  margin NUMERIC NOT NULL DEFAULT 0,
  swap NUMERIC NOT NULL DEFAULT 0,

  -- Pending-order-only fields
  order_type TEXT CHECK (order_type IN ('BUY_LIMIT', 'BUY_STOP', 'SELL_LIMIT', 'SELL_STOP')),
  target_price NUMERIC,
  expiry TEXT CHECK (expiry IN ('GTC', 'TODAY')),

  -- Close-only fields
  close_price NUMERIC,
  close_reason TEXT CHECK (close_reason IN ('manual', 'sl', 'tp', 'trailing_sl')),
  final_pnl NUMERIC,
  final_pips NUMERIC,
  final_swap NUMERIC,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'cancelled')),

  open_time TEXT NOT NULL,
  open_timestamp BIGINT NOT NULL,
  close_time TEXT,
  close_duration TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forex_trades_participant_email ON forex_trades(participant_email);
CREATE INDEX IF NOT EXISTS idx_forex_trades_status ON forex_trades(status);
CREATE INDEX IF NOT EXISTS idx_forex_trades_participant_status ON forex_trades(participant_email, status);
