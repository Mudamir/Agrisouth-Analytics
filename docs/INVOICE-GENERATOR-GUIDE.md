# Invoice PDF Generator

## Overview
The Invoice PDF Generator allows you to create professional PDF invoices based on invoice numbers. All shipping records with the same invoice number will be grouped together in a single invoice document.

## Features

### ✅ What's Included
- **Automatic Data Aggregation**: Fetches all shipping records with the same invoice number
- **Professional Format**: Matches your company's official invoice template
- **Complete Details**: Includes all shipping information (BL No., containers, vessel, dates, etc.)
- **Grouped Items**: Items are automatically grouped by pack type with quantity calculations
- **Multiple Containers**: Supports multiple containers per invoice
- **Customer Information**: Automatically populates customer details based on customer name
- **One-Click Download**: Generate and download PDF with a single click

### 📋 Invoice Sections
1. **Company Header**: AGSOUTH FRUITS PACIFIC BRANCH OFFICE with Davao office address
2. **Invoice Details**: Invoice number and date
3. **Bill To**: Customer information (name, address, country)
4. **Items Table**: List of products with quantities, unit prices, and amounts
5. **Shipping Details**: 
   - Week No., Term (FOB), Carrier, BL No.
   - Vessel Name, Voyage No., Port of Loading
   - ETD, Port of Discharge, ETA
   - Container Numbers with carton counts
6. **Footer**: Prepared by section with contact information

## How to Use

### Step 1: Access the Invoice Generator
1. Go to the **Data Management** page
2. Click the **"Generate Invoice"** button (blue button with file icon)

### Step 2: Select Invoice Number
1. In the dialog that opens, click the **"Invoice Number"** dropdown
2. Select the invoice number you want to generate a PDF for
3. The system will automatically fetch all related shipping records

### Step 3: Review Invoice Preview
After selecting an invoice, you'll see a summary showing:
- Invoice Number
- Invoice Date
- Total Records (number of shipping records)
- Number of Containers
- Total Cartons
- Customer Name
- BL Number

### Step 4: Download PDF
1. Click the **"Download Invoice PDF"** button
2. The PDF will be generated and automatically downloaded to your computer
3. Filename format: `Invoice_[InvoiceNo]_[Date].pdf`
   - Example: `Invoice_B2026001_2026-02-10.pdf`

## Data Requirements

### Required Fields
For a complete invoice, ensure your shipping records have:
- ✅ Invoice Number (`invoice_no`) - **Required to group records**
- ✅ Invoice Date (`invoice_date`)
- ✅ Container Number (`container`)
- ✅ Pack Type (`pack`)
- ✅ Cartons (`cartons`)
- ✅ Customer Name (`customer_name`)
- ✅ Billing Number (`billing_no`)
- ✅ Week, Item, ETD, ETA, POL, Destination
- ✅ Vessel, Shipping Line (S.Line)

### Optional Fields
- Voyage Number (currently shows "N/A" if not provided)
- Unit Prices and Amounts (currently calculated based on your pricing logic)

## Customer Information

The system automatically populates customer addresses for:

### Mohammed Abdallah Sharbatly Co Ltd
```
P.O. Box 4150
Jeddah 21491
Saudi Arabia
```

### Santito Brands Inc
```
[Company Address Line 1]
[Company Address Line 2]
```

*Note: Update the address in `src/components/invoice/InvoicePDF.tsx` if needed.*

## Technical Details

### Components
- **`InvoiceGenerator.tsx`**: Main UI component with invoice selection dialog
- **`InvoicePDF.tsx`**: PDF template using @react-pdf/renderer
- **`useInvoiceData.ts`**: Data fetching hooks for invoice data

### Database Query
The system queries the `shipping_records` table:
```sql
SELECT * FROM shipping_records 
WHERE invoice_no = '[selected_invoice]'
ORDER BY container ASC
```

### Data Grouping Logic
- **By Pack Type**: Items are grouped by pack description (e.g., "Philippine Bananas 13.5 KG A")
- **By Container**: Container numbers are listed with their total carton counts
- **Invoice Linking**: All records with the same `invoice_no` are included in one invoice

## Troubleshooting

### No Invoice Numbers Available
- **Cause**: No shipping records have invoice numbers assigned
- **Solution**: Add records with invoice numbers using the "Add Record" form

### Invoice Data Not Loading
- **Cause**: Database connection issue or invalid invoice number
- **Solution**: Check your internet connection and ensure the invoice number exists

### Missing Information in PDF
- **Cause**: Some fields are empty in the database
- **Solution**: Update the shipping records to include all required fields

### PDF Not Downloading
- **Cause**: Browser blocking downloads or PDF generation error
- **Solution**: 
  - Check browser's download settings
  - Allow pop-ups from the application
  - Check browser console for errors

## Customization

### Modifying the Invoice Template
Edit `src/components/invoice/InvoicePDF.tsx` to customize:
- Company logo and branding
- Layout and styling
- Additional fields or sections
- Calculations for unit prices and amounts

### Adding Unit Prices
Currently, the template has placeholder logic for unit prices. To add actual pricing:
1. Add a `unit_price` field to your database
2. Update the `InvoicePDF.tsx` component to use the stored prices
3. Calculate amounts: `amount = qty × unit_price`

### Styling Changes
The PDF uses React-PDF's StyleSheet API. Modify the `styles` object in `InvoicePDF.tsx`:
```typescript
const styles = StyleSheet.create({
  // Customize colors, fonts, spacing, etc.
});
```

## Future Enhancements

### Planned Features
- [ ] Add unit prices and amount calculations
- [ ] Include company logo in PDF
- [ ] Support for multiple currencies
- [ ] Email invoice directly from the application
- [ ] Batch invoice generation
- [ ] Invoice history and tracking
- [ ] Custom invoice templates per customer

## Support

For issues or feature requests, contact:
- Tel. No. (082) 298-2908
- Email: davao@sharbatlyfruit.com.ph

---

**Last Updated**: February 10, 2026  
**Version**: 1.0.0


