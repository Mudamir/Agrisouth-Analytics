# Invoice Columns Implementation Guide

## Overview

This implementation adds four new columns to the `shipping_records` database table and provides a script to upsert invoice data from an Excel file.

## New Columns Added

1. **`customer_name`** (VARCHAR(255)) - Customer name
2. **`invoice_no`** (VARCHAR(100)) - Invoice number
3. **`invoice_date`** (DATE) - Invoice date
4. **`vessel`** (VARCHAR(255)) - Vessel name
5. **`billing_no`** (VARCHAR(100)) - Billing number (BL #)

## Implementation Steps

### Step 1: Run Database Migration

**⚠️ IMPORTANT: Run this first before using the upsert script!**

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `scripts/migrations/add-invoice-columns.sql`
4. Execute the SQL

This will:
- Add the 4 new columns to `shipping_records` table
- Create indexes for faster lookups
- Make the columns nullable (optional)

### Step 2: Verify TypeScript Types

The following files have been updated:
- ✅ `src/lib/supabase.ts` - Added fields to `DatabaseShippingRecord` type
- ✅ `src/types/shipping.ts` - Added fields to `ShippingRecord` interface
- ✅ `src/hooks/useShippingData.ts` - Updated `transformRecord` function

### Step 3: Run the Upsert Script

```bash
npm run upsert:invoice
```

This script will:
1. Read the Excel file: `scripts/Data/Shipping Data New (All-New) - WITH INVOICE DATA - 2026-02-03.xlsx`
2. Match records by **ETD** + **Container Number**
3. Update existing records with invoice data
4. Provide a detailed summary report

## Matching Logic

The script matches records using:
- **ETD** (date) - Must match exactly
- **Container** (normalized to uppercase) - Must match exactly

If a match is found, it updates:
- `customer_name`
- `invoice_no`
- `invoice_date`
- `vessel`
- `billing_no`

## Files Created/Modified

### New Files
- `scripts/migrations/add-invoice-columns.sql` - Database migration
- `scripts/upsert-invoice-data.mjs` - Upsert script
- `scripts/migrations/README.md` - Migration documentation
- `scripts/UPSERT-INVOICE-DATA-README.md` - Upsert script documentation

### Modified Files
- `src/lib/supabase.ts` - Added new fields to database type
- `src/types/shipping.ts` - Added new fields to frontend type
- `src/hooks/useShippingData.ts` - Updated transform function
- `package.json` - Added `upsert:invoice` script

## Usage Example

```bash
# 1. Run migration in Supabase SQL Editor first
# 2. Then run the upsert script
npm run upsert:invoice
```

## Expected Output

```
🚀 Starting Invoice Data Upsert Process
============================================================

📖 STEP 1: Reading Excel file...
   ✅ Found file: Shipping Data New (All-New) - WITH INVOICE DATA - 2026-02-03.xlsx

📋 STEP 2: Mapping columns...
   Container: Column 9
   ETD: Column 3
   Vessel: Column 15
   Invoice Date: Column 17
   Invoice No: Column 16
   Customer Name: Column X

🔄 STEP 3: Processing rows...
   ✅ Valid records with invoice data: 2894

💾 STEP 4: Upserting data to database...
   ✅ Successfully updated: 2894
   ⚠️  Records not found: 0
   ❌ Errors: 0
   📈 Success rate: 100.00%
```

## Troubleshooting

### "No record found" warnings
- The container/ETD combination doesn't exist in your database
- Check for date format mismatches
- Verify container numbers match exactly

### Missing columns error
- Ensure the Excel file has the expected column headers
- Column names are case-insensitive

### Database connection errors
- Verify your Supabase credentials in `.env` file
- Check that your Supabase project is accessible

## Next Steps

After running the upsert:
1. ✅ Verify data in Supabase dashboard
2. ✅ Update UI components to display new columns (if needed)
3. ✅ Test data queries and filters

## Database Schema

After migration, your `shipping_records` table will have:

```sql
CREATE TABLE shipping_records (
  id UUID PRIMARY KEY,
  year INT,
  week INT,
  etd DATE,
  pol VARCHAR,
  item VARCHAR,
  destination VARCHAR,
  supplier VARCHAR,
  s_line VARCHAR,
  container VARCHAR,
  pack VARCHAR,
  l_cont NUMERIC,
  cartons INT,
  price NUMERIC,
  type VARCHAR,
  customer_name VARCHAR(255),    -- NEW
  invoice_no VARCHAR(100),        -- NEW
  invoice_date DATE,              -- NEW
  vessel VARCHAR(255),            -- NEW
  billing_no VARCHAR(100),        -- NEW
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_contract BOOL
);
```

## Support

For issues or questions:
1. Check the detailed README files in `scripts/` directory
2. Review the script output for error messages
3. Verify database migration was successful

