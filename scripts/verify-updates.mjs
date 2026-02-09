import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service role key to bypass RLS for verification
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY === supabaseKey;
if (!isServiceRole) {
  console.warn('⚠️  WARNING: Using ANON_KEY - RLS policies may hide updated records');
  console.warn('   Use SUPABASE_SERVICE_ROLE_KEY for accurate verification');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verifyUpdates() {
  console.log('🔍 Verifying Invoice Data Updates in Database');
  console.log('='.repeat(80));
  
  // Check a sample of records with invoice data
  // Use multiple queries to check each field (more reliable than complex OR)
  const { data: records, error } = await supabase
    .from('shipping_records')
    .select('id, container, etd, vessel, invoice_no, invoice_date, customer_name, billing_no')
    .or('vessel.not.is.null,invoice_no.not.is.null,invoice_date.not.is.null,customer_name.not.is.null,billing_no.not.is.null')
    .limit(50);
  
  // Also try a simpler query to check if any data exists
  const { data: simpleCheck, error: simpleError } = await supabase
    .from('shipping_records')
    .select('id, vessel, invoice_no')
    .not('vessel', 'is', null)
    .limit(5);
  
  if (simpleError) {
    console.error('❌ Error with simple query:', simpleError.message);
    console.error('   Code:', simpleError.code);
  } else if (simpleCheck && simpleCheck.length > 0) {
    console.log(`\n✅ Found ${simpleCheck.length} records with vessel data (simple query)`);
    console.log('   This confirms data exists, but OR query might have issues\n');
  }
  
  if (error) {
    console.error('❌ Error fetching records:', error.message);
    process.exit(1);
  }
  
  if (!records || records.length === 0) {
    console.log('⚠️  No records found with invoice data.');
    console.log('   This could mean:');
    console.log('   1. The upsert script hasn\'t been run yet');
    console.log('   2. The updates failed due to RLS policies');
    console.log('   3. No matching records were found in the database');
    return;
  }
  
  console.log(`\n✅ Found ${records.length} records with invoice data (showing first 20):\n`);
  
  records.forEach((record, idx) => {
    console.log(`${idx + 1}. Container: ${record.container}, ETD: ${record.etd}`);
    if (record.vessel) console.log(`   Vessel: ${record.vessel}`);
    if (record.invoice_no) console.log(`   Invoice No: ${record.invoice_no}`);
    if (record.invoice_date) console.log(`   Invoice Date: ${record.invoice_date}`);
    if (record.customer_name) console.log(`   Customer: ${record.customer_name}`);
    if (record.billing_no) console.log(`   Billing No: ${record.billing_no}`);
    console.log('');
  });
  
  // Get total counts
  const { count: totalWithVessel } = await supabase
    .from('shipping_records')
    .select('*', { count: 'exact', head: true })
    .not('vessel', 'is', null);
  
  const { count: totalWithInvoice } = await supabase
    .from('shipping_records')
    .select('*', { count: 'exact', head: true })
    .not('invoice_no', 'is', null);
  
  const { count: totalRecords } = await supabase
    .from('shipping_records')
    .select('*', { count: 'exact', head: true });
  
  console.log('📊 Summary:');
  console.log(`   Total records in database: ${totalRecords || 0}`);
  console.log(`   Records with vessel: ${totalWithVessel || 0}`);
  console.log(`   Records with invoice_no: ${totalWithInvoice || 0}`);
}

verifyUpdates().catch(console.error);

