-- Check how many rows have no invoice number
-- This query counts records where invoice_no is NULL or empty

-- Count total records
SELECT 
  COUNT(*) as total_records
FROM shipping_records;

-- Count records with invoice_no
SELECT 
  COUNT(*) as records_with_invoice_no
FROM shipping_records
WHERE invoice_no IS NOT NULL 
  AND invoice_no != '';

-- Count records WITHOUT invoice_no (NULL or empty)
SELECT 
  COUNT(*) as records_without_invoice_no
FROM shipping_records
WHERE invoice_no IS NULL 
   OR invoice_no = '';

-- Detailed breakdown with percentages
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN invoice_no IS NOT NULL AND invoice_no != '' THEN 1 END) as with_invoice_no,
  COUNT(CASE WHEN invoice_no IS NULL OR invoice_no = '' THEN 1 END) as without_invoice_no,
  ROUND(
    COUNT(CASE WHEN invoice_no IS NOT NULL AND invoice_no != '' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as percentage_with_invoice,
  ROUND(
    COUNT(CASE WHEN invoice_no IS NULL OR invoice_no = '' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as percentage_without_invoice
FROM shipping_records;

-- Breakdown by year
SELECT 
  year,
  COUNT(*) as total_records,
  COUNT(CASE WHEN invoice_no IS NOT NULL AND invoice_no != '' THEN 1 END) as with_invoice_no,
  COUNT(CASE WHEN invoice_no IS NULL OR invoice_no = '' THEN 1 END) as without_invoice_no,
  ROUND(
    COUNT(CASE WHEN invoice_no IS NULL OR invoice_no = '' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as percentage_missing
FROM shipping_records
GROUP BY year
ORDER BY year DESC;

-- Sample records without invoice_no (first 20)
SELECT 
  id,
  year,
  week,
  etd,
  container,
  item,
  destination,
  supplier,
  invoice_no,
  invoice_date,
  customer_name,
  vessel
FROM shipping_records
WHERE invoice_no IS NULL 
   OR invoice_no = ''
ORDER BY year DESC, week DESC, etd DESC
LIMIT 20;

