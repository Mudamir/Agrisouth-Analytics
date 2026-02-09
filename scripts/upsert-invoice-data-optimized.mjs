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
  process.exit(1);
}

const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY === supabaseKey;
if (!isServiceRole) {
  console.warn('⚠️  WARNING: Using ANON_KEY instead of SERVICE_ROLE_KEY');
  console.warn('   This may fail if RLS policies block updates.');
}

// Initialize Supabase client with optimized settings
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
});

// File path
const EXCEL_FILE = path.join(__dirname, 'Data', 'Shipping Data New (All-New) - WITH INVOICE DATA - 2026-02-03.xlsx');

function findExcelFile() {
  const dataDir = path.join(__dirname, 'Data');
  if (fs.existsSync(EXCEL_FILE)) return EXCEL_FILE;
  try {
    const files = fs.readdirSync(dataDir);
    const matchingFile = files.find(f => 
      f.includes('WITH INVOICE DATA') && (f.endsWith('.xlsx') || f.endsWith('.xls'))
    );
    if (matchingFile) return path.join(dataDir, matchingFile);
  } catch (e) {}
  return EXCEL_FILE;
}

const EXCEL_FILE_PATH = findExcelFile();

/**
 * Normalize container number
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
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    try {
      const date = ExcelJS.DateTime.fromExcelSerialNumber(value);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Find column index by name (case-insensitive)
 */
function findColumnIndex(worksheet, columnNames) {
  const headerRow = worksheet.getRow(1);
  const columnMap = {};
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerValue = (cell.value || '').toString().trim().toUpperCase();
    columnMap[headerValue] = colNumber;
  });
  for (const name of columnNames) {
    const upperName = name.toUpperCase();
    if (columnMap[upperName]) return columnMap[upperName];
  }
  return null;
}

/**
 * Batch update records using PostgreSQL UPDATE with CASE statements
 * This is much more efficient than individual updates
 */
async function batchUpdateRecords(updates) {
  if (updates.length === 0) return { success: 0, errors: [] };
  
  // Group updates by which fields they're updating
  const updateGroups = new Map();
  
  updates.forEach(update => {
    const key = Object.keys(update.fields).sort().join(',');
    if (!updateGroups.has(key)) {
      updateGroups.set(key, []);
    }
    updateGroups.get(key).push(update);
  });
  
  let totalSuccess = 0;
  const errors = [];
  
  // Process each group with optimized SQL
  for (const [fieldsKey, group] of updateGroups) {
    const fields = fieldsKey.split(',');
    
    // Build CASE statements for each field
    const caseStatements = {};
    const ids = [];
    const etdContainerPairs = [];
    
    group.forEach(update => {
      ids.push(update.id);
      etdContainerPairs.push(`('${update.etd}', '${update.container.replace(/'/g, "''")}')`);
      
      fields.forEach(field => {
        if (!caseStatements[field]) {
          caseStatements[field] = [];
        }
        const value = update.fields[field];
        if (value !== null && value !== undefined) {
          const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;
          caseStatements[field].push(`WHEN etd = '${update.etd}' AND container = '${update.container.replace(/'/g, "''")}' THEN '${escapedValue}'`);
        }
      });
    });
    
    // Build SQL UPDATE statement
    const setClauses = fields.map(field => {
      const cases = caseStatements[field] || [];
      if (cases.length === 0) return null;
      return `${field} = CASE ${cases.join(' ')} ELSE ${field} END`;
    }).filter(Boolean);
    
    if (setClauses.length === 0) continue;
    
    // Use IN clause with (etd, container) pairs for better index usage
    const whereClause = etdContainerPairs.join(', ');
    
    try {
      // Execute raw SQL for maximum efficiency
      const { error } = await supabase.rpc('batch_update_invoice_data', {
        update_pairs: etdContainerPairs,
        updates: group.map(u => ({
          etd: u.etd,
          container: u.container,
          fields: u.fields
        }))
      });
      
      if (error) {
        // Fallback to individual updates if RPC doesn't exist
        console.log('   ⚠️  RPC function not found, using fallback method...');
        for (const update of group) {
          try {
            const { error: updateError } = await supabase
              .from('shipping_records')
              .update(update.fields)
              .eq('etd', update.etd)
              .eq('container', update.container);
            
            if (updateError) {
              errors.push({ ...update, error: updateError.message });
            } else {
              totalSuccess++;
            }
          } catch (e) {
            errors.push({ ...update, error: e.message });
          }
        }
      } else {
        totalSuccess += group.length;
      }
    } catch (e) {
      // Fallback to Supabase client batch updates
      const updatePromises = group.map(update =>
        supabase
          .from('shipping_records')
          .update(update.fields)
          .eq('etd', update.etd)
          .eq('container', update.container)
      );
      
      const results = await Promise.allSettled(updatePromises);
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          totalSuccess++;
        } else {
          errors.push({
            ...group[idx],
            error: result.status === 'rejected' ? result.reason.message : result.value.error?.message
          });
        }
      });
    }
  }
  
  return { success: totalSuccess, errors };
}

/**
 * Optimized upsert using batch operations
 */
async function upsertInvoiceData() {
  console.log('🚀 Starting Optimized Invoice Data Upsert Process');
  console.log('='.repeat(80));
  const startTime = Date.now();
  
  // Step 1: Read Excel file
  console.log('\n📖 STEP 1: Reading Excel file...');
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    console.error(`❌ File not found: ${EXCEL_FILE_PATH}`);
    process.exit(1);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE_PATH);
  const worksheet = workbook.worksheets[0];
  
  if (!worksheet) {
    console.error(`❌ No worksheet found`);
    process.exit(1);
  }
  
  console.log(`   ✅ Found ${worksheet.rowCount} rows (including header)`);
  
  // Step 2: Find column indices
  console.log('\n📋 STEP 2: Mapping columns...');
  const containerCol = findColumnIndex(worksheet, ['CONTAINER', 'CONTAINER NO', 'CONTAINER NO.', 'CONTAINER NUMBER']);
  const etdCol = findColumnIndex(worksheet, ['ETD', 'ETD DATE']);
  const vesselCol = findColumnIndex(worksheet, ['VESSEL', 'VESSEL NAME']);
  const billingNoCol = findColumnIndex(worksheet, ['BILLING NO', 'BILLING NO.', 'BILLING NUMBER', 'BL #', 'BL#']);
  const invoiceDateCol = findColumnIndex(worksheet, ['INVOICE DATE', 'INVOICE DATE']);
  const invoiceNoCol = findColumnIndex(worksheet, ['INVOICE NO', 'INVOICE NO.', 'INVOICE NUMBER', 'INVOICE#', 'INV NO']);
  const customerNameCol = findColumnIndex(worksheet, ['CUSTOMER NAME', 'CUSTOMER', 'CUSTOMER NAME', 'CLIENT NAME']);
  
  if (!containerCol || !etdCol) {
    console.error(`❌ Missing required columns (Container and ETD)`);
    process.exit(1);
  }
  
  // Step 3: Extract all invoice data
  console.log('\n🔄 STEP 3: Extracting invoice data from Excel...');
  const invoiceDataMap = new Map(); // key: "container|etd" -> invoice data
  
  // Customer name mapping rules
  const getCustomerName = (invoiceNo, year) => {
    if (!invoiceNo) return null;
    
    const invoiceStr = invoiceNo.toString().trim().toUpperCase();
    
    // If invoice number starts with "SB" and year is 2025
    if (invoiceStr.startsWith('SB') && year === 2025) {
      return 'Santito Brands Inc';
    }
    
    // All other cases
    return 'Mohammed Abdallah Sharbatly Co Ltd';
  };
  
  // Find year column for customer name logic
  const yearCol = findColumnIndex(worksheet, ['YEAR']);
  
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const container = normalizeContainer(row.getCell(containerCol).value);
    const etd = parseDate(row.getCell(etdCol).value);
    
    if (!container || !etd) continue;
    
    // Get year for customer name logic
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
    
    const key = `${container}|${etd}`;
    const invoiceNo = invoiceNoCol ? (row.getCell(invoiceNoCol).value || '').toString().trim() || null : null;
    
    const data = {
      vessel: vesselCol ? (row.getCell(vesselCol).value || '').toString().trim() || null : null,
      invoiceNo: invoiceNo,
      invoiceDate: invoiceDateCol ? parseDate(row.getCell(invoiceDateCol).value) : null,
      customerName: null, // Will be set based on invoice number
      billingNo: billingNoCol ? (row.getCell(billingNoCol).value || '').toString().trim() || null : null,
    };
    
    // Set customer name based on invoice number pattern
    if (invoiceNo) {
      data.customerName = getCustomerName(invoiceNo, year);
    } else {
      // If no invoice number, use value from Excel if present
      data.customerName = customerNameCol ? (row.getCell(customerNameCol).value || '').toString().trim() || null : null;
    }
    
    // Only store if we have at least one field
    if (data.vessel || data.invoiceNo || data.invoiceDate || data.customerName || data.billingNo) {
      invoiceDataMap.set(key, { container, etd, ...data });
    }
  }
  
  // Count customer name assignments
  let santitoCount = 0;
  let sharbatlyCount = 0;
  invoiceDataMap.forEach(data => {
    if (data.customerName === 'Santito Brands Inc') santitoCount++;
    if (data.customerName === 'Mohammed Abdallah Sharbatly Co Ltd') sharbatlyCount++;
  });
  
  console.log(`   ✅ Extracted ${invoiceDataMap.size} records with invoice data`);
  if (santitoCount > 0 || sharbatlyCount > 0) {
    console.log(`   📋 Customer name assignments:`);
    if (santitoCount > 0) console.log(`      Santito Brands Inc: ${santitoCount}`);
    if (sharbatlyCount > 0) console.log(`      Mohammed Abdallah Sharbatly Co Ltd: ${sharbatlyCount}`);
  }
  
  if (invoiceDataMap.size === 0) {
    console.error('\n❌ No valid invoice data found!');
    process.exit(1);
  }
  
  // Step 4: Fetch all matching records from database in ONE query
  console.log('\n💾 STEP 4: Fetching matching records from database...');
  const containerEtdPairs = Array.from(invoiceDataMap.values()).map(d => ({
    container: d.container,
    etd: d.etd
  }));
  
  // Fetch in batches using parallel queries for maximum efficiency
  const BATCH_SIZE = 200; // Smaller batches for better parallelization
  const allMatches = new Map(); // key: "container|etd" -> { id, ... }
  
  // Process batches in parallel (up to 5 concurrent batches)
  const CONCURRENT_BATCHES = 5;
  
  for (let i = 0; i < containerEtdPairs.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const superBatch = containerEtdPairs.slice(i, i + (BATCH_SIZE * CONCURRENT_BATCHES));
    const batchPromises = [];
    
    // Create parallel queries for this super-batch
    for (let j = 0; j < superBatch.length; j += BATCH_SIZE) {
      const batch = superBatch.slice(j, j + BATCH_SIZE);
      
      // Build OR conditions for this batch
      const conditions = batch.map(p => 
        `and(container.eq.${p.container},etd.eq.${p.etd})`
      ).join(',');
      
      batchPromises.push(
        supabase
          .from('shipping_records')
          .select('id, container, etd')
          .or(conditions)
      );
    }
    
    // Execute all queries in parallel
    const results = await Promise.allSettled(batchPromises);
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.data) {
        result.value.data.forEach(record => {
          const key = `${record.container}|${record.etd}`;
          allMatches.set(key, record);
        });
      } else if (result.status === 'fulfilled' && result.value.error) {
        console.error(`   ⚠️  Error in batch: ${result.value.error.message}`);
      }
    });
    
    if ((i + BATCH_SIZE * CONCURRENT_BATCHES) % 1000 === 0 || i + BATCH_SIZE * CONCURRENT_BATCHES >= containerEtdPairs.length) {
      console.log(`   Processed ${Math.min(i + BATCH_SIZE * CONCURRENT_BATCHES, containerEtdPairs.length)}/${containerEtdPairs.length} lookup pairs...`);
    }
  }
  
  console.log(`   ✅ Found ${allMatches.size} matching records in database`);
  
  // Step 5: Prepare batch updates
  console.log('\n🔄 STEP 5: Preparing batch updates...');
  const updates = [];
  
  for (const [key, invoiceData] of invoiceDataMap) {
    const match = allMatches.get(key);
    if (!match) continue;
    
    const updateFields = {};
    if (invoiceData.vessel !== null) updateFields.vessel = invoiceData.vessel;
    if (invoiceData.invoiceNo !== null) updateFields.invoice_no = invoiceData.invoiceNo;
    if (invoiceData.invoiceDate !== null) updateFields.invoice_date = invoiceData.invoiceDate;
    if (invoiceData.customerName !== null) updateFields.customer_name = invoiceData.customerName;
    if (invoiceData.billingNo !== null) updateFields.billing_no = invoiceData.billingNo;
    
    if (Object.keys(updateFields).length > 0) {
      updates.push({
        id: match.id,
        container: invoiceData.container,
        etd: invoiceData.etd,
        fields: updateFields
      });
    }
  }
  
  console.log(`   ✅ Prepared ${updates.length} updates`);
  
  // Step 6: Execute batch updates
  console.log('\n💾 STEP 6: Executing batch updates...');
  const UPDATE_BATCH_SIZE = 100;
  let totalSuccess = 0;
  let totalErrors = 0;
  const allErrors = [];
  
  for (let i = 0; i < updates.length; i += UPDATE_BATCH_SIZE) {
    const batch = updates.slice(i, i + UPDATE_BATCH_SIZE);
    const batchNum = Math.floor(i / UPDATE_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(updates.length / UPDATE_BATCH_SIZE);
    
    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
    
    // Use Promise.all for parallel updates within batch
    const updatePromises = batch.map(update =>
      supabase
        .from('shipping_records')
        .update(update.fields)
        .eq('etd', update.etd)
        .eq('container', update.container)
        .select('id') // Select to verify update actually happened
    );
    
    const results = await Promise.allSettled(updatePromises);
    
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        if (response.error) {
          totalErrors++;
          const errorInfo = {
            ...batch[idx],
            error: response.error.message,
            code: response.error.code,
            details: response.error.details,
            hint: response.error.hint
          };
          allErrors.push(errorInfo);
          
          // Log RLS errors prominently
          if (response.error.code === '42501' || response.error.message?.includes('permission') || response.error.message?.includes('policy')) {
            console.error(`     🔒 RLS Error: Container ${batch[idx].container}, ETD ${batch[idx].etd}`);
            console.error(`        ${response.error.message}`);
          }
        } else if (response.data && response.data.length > 0) {
          // Update succeeded and returned data
          totalSuccess++;
        } else {
          // No error but no data - likely RLS blocking the update silently
          totalErrors++;
          allErrors.push({
            ...batch[idx],
            error: 'Update returned no data (likely RLS policy blocking)',
            code: 'RLS_BLOCKED'
          });
          if (totalErrors <= 5) {
            console.error(`     ⚠️  Silent RLS block: Container ${batch[idx].container}, ETD ${batch[idx].etd}`);
            console.error(`        Update appeared successful but no data returned`);
          }
        }
      } else {
        totalErrors++;
        allErrors.push({
          ...batch[idx],
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    // Small delay between batches
    if (i + UPDATE_BATCH_SIZE < updates.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 UPSERT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total records in Excel: ${invoiceDataMap.size}`);
  console.log(`Records found in database: ${allMatches.size}`);
  console.log(`✅ Successfully updated: ${totalSuccess}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⏭️  Not found in database: ${invoiceDataMap.size - allMatches.size}`);
  console.log(`⏱️  Total time: ${duration}s`);
  console.log(`📈 Throughput: ${(totalSuccess / parseFloat(duration)).toFixed(0)} records/second`);
  console.log('='.repeat(80));
  
  if (allErrors.length > 0) {
    const rlsErrors = allErrors.filter(e => 
      e.code === '42501' || 
      e.code === 'RLS_BLOCKED' ||
      e.error?.includes('permission') || 
      e.error?.includes('policy') ||
      e.error?.includes('RLS')
    );
    
    if (rlsErrors.length > 0) {
      console.log(`\n🔒 ${rlsErrors.length} RLS Policy Errors detected!`);
      console.log('   ⚠️  CRITICAL: Updates are being blocked by Row Level Security policies.');
      console.log('   📝 SOLUTION: Add SUPABASE_SERVICE_ROLE_KEY to your .env file:');
      console.log('      1. Go to Supabase Dashboard → Settings → API');
      console.log('      2. Copy the "service_role" key (NOT the anon key)');
      console.log('      3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
      console.log('      4. Run the script again');
      
      if (rlsErrors.length <= 5) {
        console.log('\n   Sample blocked records:');
        rlsErrors.slice(0, 5).forEach((err, idx) => {
          console.log(`      ${idx + 1}. Container: ${err.container}, ETD: ${err.etd}`);
        });
      }
    }
    
    const otherErrors = allErrors.filter(e => !rlsErrors.includes(e));
    if (otherErrors.length > 0 && otherErrors.length <= 10) {
      console.log(`\n❌ Other Errors (${otherErrors.length}):`);
      otherErrors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Container: ${err.container}, ETD: ${err.etd}`);
        console.log(`      Error: ${err.error}`);
      });
    }
  } else if (!isServiceRole) {
    console.log('\n⚠️  WARNING: Script reported success but you\'re using ANON_KEY.');
    console.log('   RLS policies may have silently blocked updates.');
    console.log('   Run verification: npm run verify:invoice');
    console.log('   If no data found, use SUPABASE_SERVICE_ROLE_KEY and re-run.');
  }
  
  console.log('\n✅ Upsert process completed!');
}

// Run the upsert
upsertInvoiceData().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

