-- Track which wallet address each GRAIL user was registered with.
-- If the session wallet changes (e.g. session derivation bump), we detect the mismatch
-- and re-create the GRAIL user with the new wallet.
ALTER TABLE users ADD COLUMN grail_registered_wallet TEXT;

-- Clear stale GRAIL user IDs from the old partner-purchase flow.
-- These were registered with the main wallet, not the session wallet,
-- and will fail with purchaseGoldForUser (signer mismatch).
UPDATE users SET grail_user_id = NULL, grail_user_pda = NULL, grail_registered_wallet = NULL
WHERE grail_user_id IS NOT NULL;
