-- Migration: Add Invoice and Customer Columns to shipping_records
-- Date: 2026-02-03
-- Description: Adds customer_name, invoice_no, invoice_date, vessel, and billing_no columns

-- Add new columns to shipping_records table
ALTER TABLE shipping_records
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS vessel VARCHAR(255),
  ADD COLUMN IF NOT EXISTS billing_no VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN shipping_records.customer_name IS 'Customer name for the shipping record';
COMMENT ON COLUMN shipping_records.invoice_no IS 'Invoice number';
COMMENT ON COLUMN shipping_records.invoice_date IS 'Invoice date';
COMMENT ON COLUMN shipping_records.vessel IS 'Vessel name';
COMMENT ON COLUMN shipping_records.billing_no IS 'Billing number (BL #)';

-- Create index on (etd, container) for faster lookups during upserts
CREATE INDEX IF NOT EXISTS idx_shipping_records_etd_container 
ON shipping_records(etd, container);

-- Optional: Create index on invoice_no for faster invoice lookups
CREATE INDEX IF NOT EXISTS idx_shipping_records_invoice_no 
ON shipping_records(invoice_no) 
WHERE invoice_no IS NOT NULL;

