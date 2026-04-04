-- Payment Router & Ledger Enhancements
-- Cash: destination (Office/Lorry/Driver), narration
-- Bank: account, ref, slip details  
-- Cheque: chq no, bank, deposit_bank, post_date, return_charges

ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS cash_destination TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS narration TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS deposit_bank TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS post_date DATE;
ALTER TABLE customer_ledger ADD COLUMN IF NOT EXISTS payment_id UUID;
