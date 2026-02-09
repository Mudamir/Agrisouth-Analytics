# Database Migrations

This directory contains SQL migration scripts for the Agrisouth Analytics database.

## Running Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Option 2: Via Supabase CLI

```bash
supabase db push
```

## Available Migrations

### `add-invoice-columns.sql`

**Date:** 2026-02-03

**Description:** Adds invoice and customer columns to the `shipping_records` table.

**Columns Added:**
- `customer_name` (VARCHAR(255)) - Customer name for the shipping record
- `invoice_no` (VARCHAR(100)) - Invoice number
- `invoice_date` (DATE) - Invoice date
- `vessel` (VARCHAR(255)) - Vessel name
- `billing_no` (VARCHAR(100)) - Billing number (BL #)

**Indexes Created:**
- `idx_shipping_records_etd_container` - For faster lookups during upserts
- `idx_shipping_records_invoice_no` - For faster invoice lookups

**Usage:**
```sql
-- Run this migration before using the upsert-invoice-data.mjs script
```

## Migration Order

Always run migrations in chronological order (by date/version number).

