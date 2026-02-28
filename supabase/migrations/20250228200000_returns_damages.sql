-- Returns & Damages Module
-- Market Returns (Expiry), Damage Returns, Samples, Pack Damages

-- Add customer_id to stock_movements for customer-linked returns/samples
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS return_ref TEXT;  -- e.g. RET-001 for batch reference
