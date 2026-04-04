-- Add default discount for invoice (Customer + Area based)
-- Run this in Supabase SQL Editor if the column doesn't exist yet.
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS default_discount numeric DEFAULT 0;

COMMENT ON COLUMN customers.default_discount IS 'Default discount % applied when creating invoice for this customer (editable per line).';
