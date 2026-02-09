import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL');
  process.exit(1);
}

console.log('🔍 Testing RLS Access for Invoice Data Updates');
console.log('='.repeat(80));

// Test with ANON key
if (anonKey) {
  console.log('\n📋 Testing with ANON_KEY...');
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  
  // Try to read a record
  const { data: readData, error: readError } = await anonClient
    .from('shipping_records')
    .select('id, container, etd, vessel, invoice_no')
    .limit(1)
    .single();
  
  if (readError) {
    console.log(`   ❌ Read failed: ${readError.message} (Code: ${readError.code})`);
  } else {
    console.log('   ✅ Read successful');
  }
  
  // Try to update a record
  if (readData) {
    const { data: updateData, error: updateError } = await anonClient
      .from('shipping_records')
      .update({ vessel: 'TEST VESSEL' })
      .eq('id', readData.id)
      .select('id, vessel')
      .single();
    
    if (updateError) {
      console.log(`   ❌ Update failed: ${updateError.message} (Code: ${updateError.code})`);
      if (updateError.code === '42501') {
        console.log('   🔒 RLS Policy is blocking updates with ANON_KEY');
      }
    } else if (updateData) {
      console.log('   ✅ Update successful (returned data)');
      // Revert the test update
      await anonClient
        .from('shipping_records')
        .update({ vessel: readData.vessel || null })
        .eq('id', readData.id);
    } else {
      console.log('   ⚠️  Update appeared successful but returned no data');
      console.log('   🔒 This indicates RLS is silently blocking updates');
    }
  }
}

// Test with SERVICE_ROLE key
if (serviceKey) {
  console.log('\n📋 Testing with SERVICE_ROLE_KEY...');
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
  
  const { data: readData, error: readError } = await serviceClient
    .from('shipping_records')
    .select('id, container, etd, vessel, invoice_no')
    .limit(1)
    .single();
  
  if (readError) {
    console.log(`   ❌ Read failed: ${readError.message}`);
  } else {
    console.log('   ✅ Read successful');
    
    if (readData) {
      const { data: updateData, error: updateError } = await serviceClient
        .from('shipping_records')
        .update({ vessel: 'TEST VESSEL' })
        .eq('id', readData.id)
        .select('id, vessel')
        .single();
      
      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}`);
      } else if (updateData) {
        console.log('   ✅ Update successful (returned data)');
        // Revert
        await serviceClient
          .from('shipping_records')
          .update({ vessel: readData.vessel || null })
          .eq('id', readData.id);
      }
    }
  }
} else {
  console.log('\n⚠️  SERVICE_ROLE_KEY not found in environment');
  console.log('   Add it to your .env file to bypass RLS policies');
}

console.log('\n' + '='.repeat(80));
console.log('💡 Recommendation:');
if (!serviceKey) {
  console.log('   Use SUPABASE_SERVICE_ROLE_KEY for bulk update operations');
  console.log('   Get it from: Supabase Dashboard → Settings → API → service_role key');
} else {
  console.log('   ✅ SERVICE_ROLE_KEY is configured - updates should work');
}

