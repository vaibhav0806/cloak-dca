-- Track gold sales (selling gold back to USDC)
CREATE TABLE IF NOT EXISTS gold_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  gold_amount DECIMAL NOT NULL,
  usdc_received DECIMAL,
  gold_price_at_sale DECIMAL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gold_sales_user_id ON gold_sales(user_id);
