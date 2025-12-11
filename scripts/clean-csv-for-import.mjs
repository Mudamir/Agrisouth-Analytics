import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../public/Dataset/AGS-DATA.csv');
const outputFile = path.join(__dirname, '../public/Dataset/AGS-DATA-CLEANED.csv');

console.log('🧹 Cleaning CSV file for Supabase import...\n');

// Read the CSV file
const csvContent = fs.readFileSync(inputFile, 'utf-8');
const lines = csvContent.split('\n');

// Process header row
const headerLine = lines[0].trim();
const headers = headerLine.split(',').map(h => h.trim());

console.log('Original headers:', headers);

// Map headers to database column names
const headerMap = {
  'Year': 'year',
  'WEEK': 'week',
  'ETD': 'etd',
  'POL': 'pol',
  'ITEM': 'item',
  'DESTINATION': 'destination',
  'SUPPLIERS': 'supplier',
  'S.LINE': 's_line',
  'CONTAINER': 'container',
  'PACK': 'pack',
  'L.CONT': 'l_cont',
  'CARTONS': 'cartons',
  'PRICE': 'price'
};

// Create new header row
const newHeaders = [];
for (const header of headers) {
  if (headerMap[header]) {
    newHeaders.push(headerMap[header]);
  }
}
// Add type column
newHeaders.push('type');

const newHeaderLine = newHeaders.join(',');

console.log('New headers:', newHeaders);
console.log('\n');

// Process data rows
const cleanedLines = [newHeaderLine];
let processedCount = 0;
let errorCount = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue; // Skip empty lines

  const values = line.split(',').map(v => v.trim());
  
  // Remove empty columns at the end
  while (values.length > 0 && values[values.length - 1] === '') {
    values.pop();
  }

  // Skip if not enough columns
  if (values.length < 13) {
    console.warn(`⚠️  Skipping row ${i + 1}: Not enough columns (${values.length})`);
    errorCount++;
    continue;
  }

  const cleanedValues = [];

  // Year
  cleanedValues.push(values[0] || '');

  // Week
  cleanedValues.push(values[1] || '');

  // ETD - keep as is (MM/DD/YYYY format)
  cleanedValues.push(values[2] || '');

  // POL
  cleanedValues.push(values[3] || '');

  // ITEM - convert PINES to PINEAPPLES, ensure uppercase
  let item = (values[4] || '').toUpperCase().trim();
  if (item === 'PINES') {
    item = 'PINEAPPLES';
  }
  if (item !== 'BANANAS' && item !== 'PINEAPPLES') {
    console.warn(`⚠️  Row ${i + 1}: Invalid item "${values[4]}", defaulting to BANANAS`);
    item = 'BANANAS';
  }
  cleanedValues.push(item);

  // DESTINATION
  cleanedValues.push(values[5] || '');

  // SUPPLIERS -> supplier
  cleanedValues.push(values[6] || '');

  // S.LINE -> s_line
  cleanedValues.push(values[7] || '');

  // CONTAINER
  cleanedValues.push(values[8] || '');

  // PACK
  cleanedValues.push(values[9] || '');

  // L.CONT -> l_cont
  cleanedValues.push(values[10] || '');

  // CARTONS
  cleanedValues.push(values[11] || '');

  // PRICE -> price (remove $ and spaces)
  let price = (values[12] || '').trim();
  price = price.replace(/\$/g, '').replace(/\s+/g, '');
  if (!price || isNaN(parseFloat(price))) {
    console.warn(`⚠️  Row ${i + 1}: Invalid price "${values[12]}", defaulting to 0`);
    price = '0';
  }
  cleanedValues.push(price);

  // Add type column (default to CONTRACT)
  cleanedValues.push('CONTRACT');

  // Join values and add to cleaned lines
  cleanedLines.push(cleanedValues.join(','));

  processedCount++;
  
  if (processedCount % 500 === 0) {
    console.log(`✅ Processed ${processedCount} rows...`);
  }
}

// Write cleaned CSV
const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync(outputFile, cleanedContent, 'utf-8');

console.log('\n✨ CSV cleaning complete!');
console.log(`📊 Statistics:`);
console.log(`   - Total rows processed: ${processedCount}`);
console.log(`   - Rows with errors: ${errorCount}`);
console.log(`   - Output file: ${outputFile}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review the cleaned file: ${outputFile}`);
console.log(`   2. Import into Supabase using the Table Editor or SQL`);
console.log(`   3. The CSV is ready for import with proper column names and formatting`);
