# Invoice Data Upsert Script

This script imports invoice data from an Excel file into the Supabase database, matching records by **ETD** and **Container Number**.

## Prerequisites

1. **Run the database migration first:**
   ```sql
   -- Execute scripts/migrations/add-invoice-columns.sql in Supabase SQL Editor
   ```

2. **Ensure your Excel file is in the correct location:**
   - File: `scripts/Data/Shipping Data New (All-New) - WITH INVOICE DATA - 2026-02-03.xlsx`
   - Or update the `EXCEL_FILE` path in the script

3. **Set up environment variables:**
   - Create/update `.env.local` or `.env` file with:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Or use `SUPABASE_SERVICE_ROLE_KEY` for elevated permissions

## Usage

```bash
npm run upsert:invoice
```

Or directly:
```bash
node scripts/upsert-invoice-data.mjs
```

## How It Works

1. **Reads Excel File**: Parses the Excel file and extracts invoice data
2. **Matches Records**: Finds existing records in database by matching:
   - `ETD` (date)
   - `Container` (normalized to uppercase)
3. **Updates Records**: Updates the following columns if data exists:
   - `customer_name`
   - `invoice_no`
   - `invoice_date`
   - `vessel`
4. **Reports Results**: Provides detailed summary of:
   - Successfully updated records
   - Records not found in database
   - Errors encountered

## Column Mapping

The script automatically detects these columns (case-insensitive):

| Excel Column | Database Column | Required |
|-------------|----------------|----------|
| Container / Container No | `container` | ✅ Yes (for matching) |
| ETD / ETD Date | `etd` | ✅ Yes (for matching) |
| Vessel / Vessel Name | `vessel` | ❌ No |
| Invoice No / Invoice# | `invoice_no` | ❌ No |
| Invoice Date | `invoice_date` | ❌ No |
| Customer Name / Customer | `customer_name` | ❌ No |
| Billing No / BL # | `billing_no` | ❌ No |

## Matching Logic

- **Container**: Normalized to uppercase, trimmed, spaces removed
- **ETD**: Parsed from various formats (Excel dates, ISO strings, etc.)
- **Match**: Both ETD and Container must match exactly

## Output

The script provides:
- ✅ Success count
- ⚠️ Records not found (container/ETD doesn't exist in DB)
- ❌ Error details
- 📈 Success rate percentage

## Troubleshooting

### "No record found" warnings
- The container/ETD combination doesn't exist in your database
- Check for date format mismatches
- Verify container numbers match exactly (case-insensitive)

### Missing columns error
- Ensure the Excel file has the expected column headers
- Column names are case-insensitive but must contain keywords like "CONTAINER", "ETD", etc.

### Database connection errors
- Verify your Supabase credentials in `.env` file
- Check that your Supabase project is accessible
- Ensure you have write permissions

## Best Practices

1. **Backup your database** before running the script
2. **Test on a small subset** first if possible
3. **Review the summary** after execution
4. **Check unmatched records** - they may need manual review

