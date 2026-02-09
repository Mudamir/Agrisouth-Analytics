# SQL Query Scripts

This directory contains useful SQL queries for analyzing and checking the shipping_records database.

## Available Queries

### `check-missing-invoice-no.sql`

Checks how many records are missing invoice numbers.

**What it does:**
- Counts total records
- Counts records with invoice_no
- Counts records without invoice_no
- Shows percentage breakdown
- Breaks down by year
- Shows sample records missing invoice numbers

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the query you need
3. Execute

**Quick Query (just the count):**
```sql
SELECT COUNT(*) as records_without_invoice_no
FROM shipping_records
WHERE invoice_no IS NULL OR invoice_no = '';
```

## Other Useful Queries

### Check missing invoice data by field

```sql
-- Records missing vessel
SELECT COUNT(*) FROM shipping_records WHERE vessel IS NULL OR vessel = '';

-- Records missing invoice_date
SELECT COUNT(*) FROM shipping_records WHERE invoice_date IS NULL;

-- Records missing customer_name
SELECT COUNT(*) FROM shipping_records WHERE customer_name IS NULL OR customer_name = '';

-- Records missing billing_no
SELECT COUNT(*) FROM shipping_records WHERE billing_no IS NULL OR billing_no = '';
```

### Check complete invoice data

```sql
-- Records with ALL invoice fields filled
SELECT COUNT(*) 
FROM shipping_records
WHERE invoice_no IS NOT NULL 
  AND invoice_no != ''
  AND invoice_date IS NOT NULL
  AND vessel IS NOT NULL
  AND vessel != ''
  AND customer_name IS NOT NULL
  AND customer_name != '';
```

### Customer name distribution

```sql
SELECT 
  customer_name,
  COUNT(*) as count
FROM shipping_records
WHERE customer_name IS NOT NULL
GROUP BY customer_name
ORDER BY count DESC;
```

