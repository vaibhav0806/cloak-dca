-- Add error_message column to gold_sales for tracking failed sale attempts
ALTER TABLE gold_sales ADD COLUMN IF NOT EXISTS error_message TEXT;
