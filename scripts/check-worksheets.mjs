import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkWorksheets(filePath) {
  console.log(`\n📖 Checking: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found`);
    return;
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  console.log(`Total worksheets: ${workbook.worksheets.length}`);
  
  workbook.worksheets.forEach((worksheet, index) => {
    console.log(`\n📄 Worksheet ${index + 1}: "${worksheet.name}"`);
    console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
    
    // Check first row
    const firstRow = worksheet.getRow(1);
    const headers = [];
    firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const value = cell.value;
      if (value) {
        headers.push(`${colNumber}:"${value.toString().trim()}"`);
      }
    });
    
    if (headers.length > 0) {
      console.log(`   First row: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`);
    }
    
    // Check if this looks like data (has many rows with data)
    let dataRowCount = 0;
    for (let rowNum = 2; rowNum <= Math.min(100, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      let hasData = false;
      row.eachCell({ includeEmpty: false }, () => {
        hasData = true;
      });
      if (hasData) dataRowCount++;
    }
    
    console.log(`   Data rows (first 100): ${dataRowCount}`);
  });
}

const files = [
  path.join(__dirname, 'Data', 'Bananas Database OLD DATA.xlsx'),
  path.join(__dirname, 'Data', 'Pines Database OLD DATA.xlsx'),
  path.join(__dirname, 'Data', 'Shipping Data New (All).xlsx')
];

for (const file of files) {
  await checkWorksheets(file);
}




