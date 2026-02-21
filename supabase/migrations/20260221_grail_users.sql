-- Add GRAIL user tracking columns
ALTER TABLE users ADD COLUMN grail_user_id TEXT;
ALTER TABLE users ADD COLUMN grail_user_pda TEXT;

-- Add gold-specific execution tracking
ALTER TABLE executions ADD COLUMN gold_amount DECIMAL(20, 8);
ALTER TABLE executions ADD COLUMN gold_price_at_execution DECIMAL(20, 8);
