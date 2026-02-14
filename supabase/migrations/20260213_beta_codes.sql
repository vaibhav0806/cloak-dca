-- Beta invite code system
-- Each code is generated for a specific wallet address

-- Beta codes table
CREATE TABLE beta_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,  -- the wallet this code was generated for
    redeemed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_beta_codes_code ON beta_codes(code);
CREATE INDEX idx_beta_codes_wallet ON beta_codes(wallet_address);

ALTER TABLE beta_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage beta_codes"
    ON beta_codes FOR ALL
    USING (true);

-- Add beta_approved flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_approved BOOLEAN DEFAULT false;
