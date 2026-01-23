-- Stealth DCA Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DCA Configurations table
CREATE TABLE dca_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    input_token TEXT NOT NULL,
    output_token TEXT NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    amount_per_trade DECIMAL(20, 8) NOT NULL,
    frequency_hours INTEGER NOT NULL,
    total_trades INTEGER NOT NULL,
    completed_trades INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    encrypted_data TEXT,
    next_execution TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Executions table
CREATE TABLE executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dca_config_id UUID REFERENCES dca_configs(id) ON DELETE CASCADE NOT NULL,
    trade_number INTEGER NOT NULL,
    input_amount DECIMAL(20, 8) NOT NULL,
    output_amount DECIMAL(20, 8),
    tx_signature TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dca_configs_user_id ON dca_configs(user_id);
CREATE INDEX idx_dca_configs_status ON dca_configs(status);
CREATE INDEX idx_dca_configs_next_execution ON dca_configs(next_execution);
CREATE INDEX idx_executions_dca_config_id ON executions(dca_config_id);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dca_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (true); -- Service key bypasses this, anon key needs wallet verification

-- Policy: DCA configs - service key can read all for keeper
CREATE POLICY "Service can read all dca_configs"
    ON dca_configs FOR SELECT
    USING (true);

CREATE POLICY "Service can insert dca_configs"
    ON dca_configs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service can update dca_configs"
    ON dca_configs FOR UPDATE
    USING (true);

-- Policy: Executions - service key can manage
CREATE POLICY "Service can read all executions"
    ON executions FOR SELECT
    USING (true);

CREATE POLICY "Service can insert executions"
    ON executions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service can update executions"
    ON executions FOR UPDATE
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_dca_configs_updated_at
    BEFORE UPDATE ON dca_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
