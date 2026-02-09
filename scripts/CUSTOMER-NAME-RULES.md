# Customer Name Assignment Rules

## Overview

Customer names are automatically assigned based on invoice number patterns during the upsert process.

## Rules

### Rule 1: Santito Brands Inc
- **Condition**: Invoice number starts with "SB" AND year is 2025
- **Customer Name**: `Santito Brands Inc`
- **Example**: 
  - Invoice: `SB2025001` + Year: `2025` → `Santito Brands Inc`
  - Invoice: `SB2024001` + Year: `2024` → `Mohammed Abdallah Sharbatly Co Ltd` (not 2025)

### Rule 2: Mohammed Abdallah Sharbatly Co Ltd
- **Condition**: All other cases
- **Customer Name**: `Mohammed Abdallah Sharbatly Co Ltd`
- **Examples**:
  - Invoice: `P2024001` → `Mohammed Abdallah Sharbatly Co Ltd`
  - Invoice: `SB2024001` (not 2025) → `Mohammed Abdallah Sharbatly Co Ltd`
  - Invoice: `INV001` → `Mohammed Abdallah Sharbatly Co Ltd`
  - No invoice number → `Mohammed Abdallah Sharbatly Co Ltd`

## Implementation

The logic is implemented in both upsert scripts:
- `scripts/upsert-invoice-data.mjs`
- `scripts/upsert-invoice-data-optimized.mjs`

### Logic Flow

```
1. Extract invoice number from Excel
2. Extract year from Excel (or derive from ETD date)
3. Check if invoice number starts with "SB" AND year is 2025
   - YES → Set customer_name = "Santito Brands Inc"
   - NO  → Set customer_name = "Mohammed Abdallah Sharbatly Co Ltd"
4. If no invoice number exists, use value from Excel (if present)
```

## Year Detection

The script determines the year from:
1. **Year column** in Excel (if present)
2. **ETD date** (extracts year from the date)
3. Falls back to current year if neither is available

## Examples

| Invoice No | Year | Customer Name |
|------------|------|---------------|
| `SB2025001` | 2025 | Santito Brands Inc |
| `SB2025002` | 2025 | Santito Brands Inc |
| `SB2024001` | 2024 | Mohammed Abdallah Sharbatly Co Ltd |
| `P2024001` | 2024 | Mohammed Abdallah Sharbatly Co Ltd |
| `INV001` | 2025 | Mohammed Abdallah Sharbatly Co Ltd |
| `null` | 2025 | Mohammed Abdallah Sharbatly Co Ltd |

## Verification

After running the upsert script, you can verify customer name assignments:

```bash
npm run verify:invoice
```

The script will show records with their assigned customer names.

## Updating Rules

To modify these rules, edit the `getCustomerName()` function in:
- `scripts/upsert-invoice-data-optimized.mjs` (line ~280)
- `scripts/upsert-invoice-data.mjs` (line ~220)

## Notes

- Customer name assignment is **case-insensitive** for invoice number matching
- The "SB" prefix check is done on the **uppercase** version of the invoice number
- Year must be **exactly 2025** for Santito Brands Inc assignment
- If invoice number is missing, the script will use the customer name from Excel (if present)

