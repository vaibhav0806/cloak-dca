-- Blink DCA Integration Schema Migration
-- Adds support for Solana Actions/Blinks-initiated private DCAs

-- Blink deposits table: tracks USDC transfers from Blink users to the escrow wallet
CREATE TABLE blink_deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    escrow_wallet TEXT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    output_token TEXT NOT NULL,
    frequency_hours INTEGER NOT NULL,
    amount_per_trade DECIMAL(20, 8) NOT NULL,
    tx_signature TEXT UNIQUE,
    reference_key TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending_confirmation'
        CHECK (status IN ('pending_confirmation', 'confirmed', 'processing', 'processed', 'failed')),
    dca_config_id UUID REFERENCES dca_configs(id),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_blink_deposits_status ON blink_deposits(status);
CREATE INDEX idx_blink_deposits_reference ON blink_deposits(reference_key);
CREATE INDEX idx_blink_deposits_user ON blink_deposits(user_wallet);

ALTER TABLE blink_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage blink_deposits"
    ON blink_deposits FOR ALL USING (true);

-- Add source tracking to dca_configs
ALTER TABLE dca_configs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'dashboard'
    CHECK (source IN ('dashboard', 'blink'));

ALTER TABLE dca_configs ADD COLUMN IF NOT EXISTS blink_deposit_id UUID REFERENCES blink_deposits(id);

-- Update dca_configs status constraint to include pending_deposit
ALTER TABLE dca_configs DROP CONSTRAINT IF EXISTS dca_configs_status_check;
ALTER TABLE dca_configs ADD CONSTRAINT dca_configs_status_check
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'executing', 'pending_deposit'));
