import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Prefer service role key for bulk updates (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  console.error('Note: Using SERVICE_ROLE_KEY is recommended for bulk updates to bypass RLS policies');
  process.exit(1);
}

// Check which key is being used
const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY === supabaseKey;
if (!isServiceRole) {
  console.warn('⚠️  WARNING: Using ANON_KEY instead of SERVICE_ROLE_KEY');
  console.warn('   This may fail if RLS policies block updates. Consider using SERVICE_ROLE_KEY for bulk operations.');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// File path - Update this if your Excel file has a different name
const EXCEL_FILE = path.join(__dirname, 'Data', 'Shipping Data New (All-New) - WITH INVOICE DATA - 2026-02-03.xlsx');

// Alternative: Auto-detect the file if it exists with a different name
function findExcelFile() {
  const baseName = 'Shipping Data New (All-New) - WITH INVOICE DATA';
  const dataDir = path.join(__dirname, 'Data');
  
  if (fs.existsSync(EXCEL_FILE)) {
    return EXCEL_FILE;
  }
  
  // Try to find any file matching the pattern
  try {
    const files = fs.readdirSync(dataDir);
    const matchingFile = files.find(f => 
      f.includes('WITH INVOICE DATA') && 
      (f.endsWith('.xlsx') || f.endsWith('.xls'))
    );
    
    if (matchingFile) {
      return path.join(dataDir, matchingFile);
    }
  } catch (e) {
    // Ignore errors
  }
  
  return EXCEL_FILE;
}

const EXCEL_FILE_PATH = findExcelFile();

/**
 * Normalize container number (uppercase, trimmed, remove spaces)
 */
function normalizeContainer(container) {
  if (!container) return null;
  return container.toString().trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Parse date from various formats
 */
function parseDate(value) {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel date serial number)
  if (typeof value === 'number') {
    try {
      const date = ExcelJS.DateTime.fromExcelSerialNumber(value);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Try standard date parsing
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Find column index by name (case-insensitive, handles variations)
 */
function findColumnIndex(worksheet, columnNames) {
  const headerRow = worksheet.getRow(1);
  const columnMap = {};
  
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerValue = (cell.value || '').toString().trim().toUpperCase();
    columnMap[headerValue] = colNumber;
  });
  
  // Try to find any of the provided column names
  for (const name of columnNames) {
    const upperName = name.toUpperCase();
    if (columnMap[upperName]) {
      return columnMap[upperName];
    }
  }
  
  return null;
}

/**
 * Upsert invoice data to database
 */
async function upsertInvoiceData() {
  console.log('🚀 Starting Invoice Data Upsert Process');
  console.log('='.repeat(80));
  
  // Step 1: Read Excel file
  console.log('\n📖 STEP 1: Reading Excel file...');
  console.log(`   Looking for file: ${EXCEL_FILE_PATH}`);
  
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    console.error(`❌ File not found: ${EXCEL_FILE_PATH}`);
    console.error(`\n   Please ensure your Excel file is in: ${path.join(__dirname, 'Data')}`);
    console.error(`   Or update the EXCEL_FILE path in the script.`);
    process.exit(1);
  }
  
  console.log(`   ✅ Found file: ${path.basename(EXCEL_FILE_PATH)}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE_PATH);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error(`❌ No worksheet found in ${EXCEL_FILE}`);
    process.exit(1);
  }
  
  console.log(`   Found ${worksheet.rowCount} rows (including header)`);
  
  // Step 2: Find column indices
  console.log('\n📋 STEP 2: Mapping columns...');
  const containerCol = findColumnIndex(worksheet, ['CONTAINER', 'CONTAINER NO', 'CONTAINER NO.', 'CONTAINER NUMBER']);
  const etdCol = findColumnIndex(worksheet, ['ETD', 'ETD DATE']);
  const vesselCol = findColumnIndex(worksheet, ['VESSEL', 'VESSEL NAME']);
  const billingNoCol = findColumnIndex(worksheet, ['BILLING NO', 'BILLING NO.', 'BILLING NUMBER', 'BL #', 'BL#']);
  const invoiceDateCol = findColumnIndex(worksheet, ['INVOICE DATE', 'INVOICE DATE']);
  const invoiceNoCol = findColumnIndex(worksheet, ['INVOICE NO', 'INVOICE NO.', 'INVOICE NUMBER', 'INVOICE#', 'INV NO']);
  const customerNameCol = findColumnIndex(worksheet, ['CUSTOMER NAME', 'CUSTOMER', 'CUSTOMER NAME', 'CLIENT NAME']);
  
  console.log(`   Container: ${containerCol ? `Column ${containerCol}` : '❌ NOT FOUND'}`);
  console.log(`   ETD: ${etdCol ? `Column ${etdCol}` : '❌ NOT FOUND'}`);
  console.log(`   Vessel: ${vesselCol ? `Column ${vesselCol}` : '⚠️  NOT FOUND'}`);
  console.log(`   Billing No: ${billingNoCol ? `Column ${billingNoCol}` : '⚠️  NOT FOUND'}`);
  console.log(`   Invoice Date: ${invoiceDateCol ? `Column ${invoiceDateCol}` : '⚠️  NOT FOUND'}`);
  console.log(`   Invoice No: ${invoiceNoCol ? `Column ${invoiceNoCol}` : '⚠️  NOT FOUND'}`);
  console.log(`   Customer Name: ${customerNameCol ? `Column ${customerNameCol}` : '⚠️  NOT FOUND'}`);
  
  if (!containerCol || !etdCol) {
    console.error(`❌ Missing required columns (Container and ETD are required for matching)`);
    process.exit(1);
  }
  
  // Step 3: Process rows and prepare upsert data
  console.log('\n🔄 STEP 3: Processing rows and preparing upsert data...');
  const upsertData = [];
  const stats = {
    total: 0,
    valid: 0,
    skipped: 0,
    errors: []
  };
  
  // Process each data row (start from row 2)
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    stats.total++;
    
    const container = normalizeContainer(row.getCell(containerCol).value);
    const etd = parseDate(row.getCell(etdCol).value);
    
    // Skip if missing required fields
    if (!container || !etd) {
      stats.skipped++;
      if (stats.skipped <= 5) {
        console.log(`   ⏭️  Row ${rowNum}: Skipped (missing container or ETD)`);
      }
      continue;
    }
    
    // Extract invoice data
    const invoiceNo = invoiceNoCol ? (row.getCell(invoiceNoCol).value || '').toString().trim() || null : null;
    
    // Get year for customer name logic
    const yearCol = findColumnIndex(worksheet, ['YEAR']);
    let year = null;
    if (yearCol) {
      const yearValue = row.getCell(yearCol).value;
      if (yearValue) {
        year = typeof yearValue === 'number' ? yearValue : parseInt(yearValue);
      }
    }
    // Fallback: extract year from ETD date
    if (!year && etd) {
      year = new Date(etd).getFullYear();
    }
    
    // Determine customer name based on invoice number pattern
    let customerName = null;
    if (invoiceNo) {
      const invoiceStr = invoiceNo.toString().trim().toUpperCase();
      if (invoiceStr.startsWith('SB') && year === 2025) {
        customerName = 'Santito Brands Inc';
      } else {
        customerName = 'Mohammed Abdallah Sharbatly Co Ltd';
      }
    } else {
      // If no invoice number, use value from Excel if present
      customerName = customerNameCol ? (row.getCell(customerNameCol).value || '').toString().trim() || null : null;
    }
    
    const invoiceData = {
      container,
      etd,
      vessel: vesselCol ? (row.getCell(vesselCol).value || '').toString().trim() || null : null,
      invoiceNo: invoiceNo,
      invoiceDate: invoiceDateCol ? parseDate(row.getCell(invoiceDateCol).value) : null,
      customerName: customerName,
      billingNo: billingNoCol ? (row.getCell(billingNoCol).value || '').toString().trim() || null : null,
    };
    
    // Only add if we have at least one invoice field
    if (invoiceData.vessel || invoiceData.invoiceNo || invoiceData.invoiceDate || invoiceData.customerName || invoiceData.billingNo) {
      upsertData.push(invoiceData);
      stats.valid++;
    } else {
      stats.skipped++;
    }
    
    // Progress indicator
    if (rowNum % 500 === 0) {
      console.log(`   Processed ${rowNum - 1}/${worksheet.rowCount - 1} rows...`);
    }
  }
  
  console.log(`\n   ✅ Valid records with invoice data: ${stats.valid}`);
  console.log(`   ⏭️  Skipped records: ${stats.skipped}`);
  
  if (upsertData.length === 0) {
    console.error('\n❌ No valid invoice data found to upsert!');
    process.exit(1);
  }
  
  // Step 4: Upsert data to database
  console.log('\n💾 STEP 4: Upserting data to database...');
  console.log(`   Processing ${upsertData.length} records in batches...`);
  
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;
  const errors = [];
  
  for (let i = 0; i < upsertData.length; i += batchSize) {
    const batch = upsertData.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(upsertData.length / batchSize);
    
    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
    
    // Process each record in the batch
    for (const record of batch) {
      try {
        // First, find the record in the database by ETD and Container
        const { data: existingRecords, error: searchError } = await supabase
          .from('shipping_records')
          .select('id')
          .eq('etd', record.etd)
          .eq('container', record.container)
          .limit(1);
        
        if (searchError) {
          errorCount++;
          errors.push({
            container: record.container,
            etd: record.etd,
            error: `Search error: ${searchError.message}`
          });
          continue;
        }
        
        if (!existingRecords || existingRecords.length === 0) {
          notFoundCount++;
          if (notFoundCount <= 10) {
            console.log(`     ⚠️  No record found for Container: ${record.container}, ETD: ${record.etd}`);
          }
          continue;
        }
        
        // Update the record
        const updateData = {};
        if (record.vessel !== null) updateData.vessel = record.vessel;
        if (record.invoiceNo !== null) updateData.invoice_no = record.invoiceNo;
        if (record.invoiceDate !== null) updateData.invoice_date = record.invoiceDate;
        if (record.customerName !== null) updateData.customer_name = record.customerName;
        if (record.billingNo !== null) updateData.billing_no = record.billingNo;
        
        // Only update if we have data to update
        if (Object.keys(updateData).length === 0) {
          continue;
        }
        
        const { data: updatedData, error: updateError } = await supabase
          .from('shipping_records')
          .update(updateData)
          .eq('id', existingRecords[0].id)
          .select('id, vessel, invoice_no, invoice_date, customer_name, billing_no')
          .single();
        
        if (updateError) {
          errorCount++;
          const errorDetails = {
            container: record.container,
            etd: record.etd,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          };
          errors.push(errorDetails);
          
          // Log RLS/permission errors prominently
          if (updateError.code === '42501' || updateError.message?.includes('permission denied') || updateError.message?.includes('policy')) {
            console.error(`     ❌ RLS Policy Error for Container: ${record.container}, ETD: ${record.etd}`);
            console.error(`        Error: ${updateError.message}`);
            console.error(`        Solution: Use SUPABASE_SERVICE_ROLE_KEY instead of ANON_KEY`);
          } else if (updateError.code === 'PGRST116') {
            console.error(`     ⚠️  Record not found after update: Container: ${record.container}, ETD: ${record.etd}`);
          } else {
            console.error(`     ❌ Update failed: Container: ${record.container}, ETD: ${record.etd}`);
            console.error(`        Error: ${updateError.message}`);
          }
        } else if (updatedData) {
          successCount++;
          // Log first few successful updates for verification
          if (successCount <= 3) {
            console.log(`     ✅ Updated record: Container: ${record.container}, ETD: ${record.etd}`);
            console.log(`        Updated fields: ${Object.keys(updateData).join(', ')}`);
          }
        } else {
          // No error but no data returned - might be a silent failure
          errorCount++;
          errors.push({
            container: record.container,
            etd: record.etd,
            error: 'Update returned no data (possible RLS policy issue)'
          });
          console.error(`     ⚠️  Update returned no data: Container: ${record.container}, ETD: ${record.etd}`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          container: record.container,
          etd: record.etd,
          error: `Exception: ${error.message}`
        });
      }
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < upsertData.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 UPSERT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total records processed: ${stats.total}`);
  console.log(`Valid records with invoice data: ${stats.valid}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`⚠️  Records not found in database: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Success rate: ${((successCount / stats.valid) * 100).toFixed(2)}%`);
  console.log('='.repeat(80));
  
  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} errors encountered:`);
    
    // Group errors by type
    const rlsErrors = errors.filter(e => e.code === '42501' || e.error?.includes('permission') || e.error?.includes('policy'));
    const notFoundErrors = errors.filter(e => e.code === 'PGRST116' || e.error?.includes('not found'));
    const otherErrors = errors.filter(e => !rlsErrors.includes(e) && !notFoundErrors.includes(e));
    
    if (rlsErrors.length > 0) {
      console.log(`\n   🔒 RLS Policy Errors: ${rlsErrors.length}`);
      console.log(`      These updates were blocked by Row Level Security policies.`);
      console.log(`      SOLUTION: Use SUPABASE_SERVICE_ROLE_KEY in your .env file to bypass RLS.`);
      if (rlsErrors.length <= 3) {
        rlsErrors.forEach((err, idx) => {
          console.log(`      ${idx + 1}. Container: ${err.container}, ETD: ${err.etd}`);
        });
      }
    }
    
    if (notFoundErrors.length > 0) {
      console.log(`\n   ⚠️  Not Found Errors: ${notFoundErrors.length}`);
      console.log(`      Records were found initially but disappeared during update.`);
    }
    
    if (otherErrors.length > 0) {
      console.log(`\n   ❌ Other Errors: ${otherErrors.length}`);
      const showCount = Math.min(otherErrors.length, 10);
      otherErrors.slice(0, showCount).forEach((err, idx) => {
        console.log(`      ${idx + 1}. Container: ${err.container}, ETD: ${err.etd}`);
        console.log(`         Error: ${err.error}`);
        if (err.code) console.log(`         Code: ${err.code}`);
      });
      if (otherErrors.length > showCount) {
        console.log(`      ... and ${otherErrors.length - showCount} more errors`);
      }
    }
  }
  
  if (notFoundCount > 0) {
    console.log(`\n⚠️  ${notFoundCount} records from Excel were not found in the database.`);
    console.log(`   This could mean:`);
    console.log(`   - The container/ETD combination doesn't exist in the database`);
    console.log(`   - There's a mismatch in container number or date format`);
  }
  
  console.log('\n✅ Upsert process completed!');
}

// Run the upsert
upsertInvoiceData()
  .catch((error) => {
    console.error('\n❌ Fatal error during upsert:', error);
    process.exit(1);
  });

