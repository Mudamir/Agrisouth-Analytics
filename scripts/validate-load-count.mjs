/**
 * Load Count Validation Script
 * 
 * This script validates the load count (l_cont) calculations:
 * 1. For containers with the same ETD, sum all cartons
 * 2. Each container's load count = (container's cartons) / (total cartons for that ETD)
 * 3. Sum of all load counts per ETD should equal 1
 * 4. Number of unique containers per ETD should equal sum of load counts
 * 
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Run: node scripts/validate-load-count.mjs
 * 3. Optional: Add --export flag to export results to CSV
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
}

/**
 * Format date as YYYY-MM-DD for sorting
 */
function formatDateKey(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Round to avoid floating point precision issues
 */
function roundTo(value, decimals = 8) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Main validation function
 */
async function validateLoadCount() {
  console.log('🚀 Starting Load Count Validation Analysis...\n');
  console.log('🔗 Connecting to Supabase...');
  console.log('  URL:', supabaseUrl);
  console.log('');

  try {
    // Fetch all shipping records
    console.log('📊 Fetching shipping records from database...');
    let allRecords = [];
    let from = 0;
    const fetchBatchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('shipping_records')
        .select('id, etd, container, item, supplier, pack, cartons, l_cont')
        .range(from, from + fetchBatchSize - 1)
        .order('etd', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching records:', fetchError.message);
        process.exit(1);
      }

      if (batch && batch.length > 0) {
        allRecords = [...allRecords, ...batch];
        from += fetchBatchSize;
        hasMore = batch.length === fetchBatchSize;
        console.log(`  Fetched ${allRecords.length} records...`);
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Total records fetched: ${allRecords.length}\n`);

    if (allRecords.length === 0) {
      console.log('⚠️  No records found in database.');
      return;
    }

    // Group records by ETD
    console.log('🔄 Grouping records by ETD and Container, then validating load counts...');
    const etdGroups = new Map(); // Map<etd, Array<records>>

    for (const record of allRecords) {
      const etd = record.etd;
      if (!etd) continue;

      if (!etdGroups.has(etd)) {
        etdGroups.set(etd, []);
      }
      etdGroups.get(etd).push(record);
    }

    // Validate each ETD group
    const validationResults = [];
    const errors = [];
    const warnings = [];

    for (const [etd, records] of etdGroups.entries()) {
      // Step 1: Group records by Container and sum cartons for each container
      const containerGroups = new Map(); // Map<container, Array<records>>
      
      for (const record of records) {
        const container = (record.container || '').trim().toUpperCase();
        if (!container) continue;
        
        if (!containerGroups.has(container)) {
          containerGroups.set(container, []);
        }
        containerGroups.get(container).push(record);
      }

      // Step 2: Calculate total cartons per container (for this ETD)
      const containerTotals = new Map(); // Map<container, {totalCartons, records}>
      
      for (const [container, containerRecords] of containerGroups.entries()) {
        const totalCartons = containerRecords.reduce((sum, r) => sum + (r.cartons || 0), 0);
        containerTotals.set(container, {
          totalCartons,
          records: containerRecords,
        });
      }

      // Step 3: Calculate expected load count for EACH RECORD
      // Formula: Load Count = (Record's Cartons) / (Sum of all cartons for same container and ETD)
      const recordsWithExpected = [];
      const uniqueContainers = new Set(containerTotals.keys());
      const uniqueContainerCount = uniqueContainers.size;

      // Validate each record
      for (const record of records) {
        const container = (record.container || '').trim().toUpperCase();
        const containerTotalCartons = containerTotals.get(container)?.totalCartons || 0;
        const recordCartons = record.cartons || 0;
        
        // Expected load count = record's cartons / container's total cartons (for this ETD)
        const expectedLoadCount = containerTotalCartons > 0 
          ? roundTo(recordCartons / containerTotalCartons, 8) 
          : 0;
        
        const actualLoadCount = roundTo(parseFloat(record.l_cont) || 0, 8);
        const difference = roundTo(Math.abs(expectedLoadCount - actualLoadCount), 8);
        const isCorrect = difference < 0.0001; // Allow small floating point differences

        recordsWithExpected.push({
          id: record.id,
          container,
          item: record.item,
          supplier: record.supplier,
          pack: record.pack,
          cartons: recordCartons,
          actualLoadCount,
          expectedLoadCount,
          difference,
          isCorrect,
          containerTotalCartons,
        });
      }

      // Step 4: Validate container-level sums (each container's load counts should sum to 1.0)
      const containerLoadCountSums = new Map(); // Map<container, sum of load counts>
      for (const record of recordsWithExpected) {
        const container = record.container;
        const currentSum = containerLoadCountSums.get(container) || 0;
        containerLoadCountSums.set(container, roundTo(currentSum + record.actualLoadCount, 8));
      }

      // Check each container's sum equals 1.0
      const containerSumsValid = Array.from(containerLoadCountSums.entries()).every(([container, sum]) => {
        return Math.abs(sum - 1) < 0.0001;
      });

      // Find records with incorrect load counts
      const incorrectRecords = recordsWithExpected.filter(r => !r.isCorrect);

      // Create container summary
      const containerSummary = Array.from(containerTotals.entries()).map(([container, data]) => {
        const containerRecords = recordsWithExpected.filter(r => r.container === container);
        const sumActualLoadCounts = containerRecords.reduce((sum, r) => sum + r.actualLoadCount, 0);
        const sumExpectedLoadCounts = containerRecords.reduce((sum, r) => sum + r.expectedLoadCount, 0);
        
        return {
          container,
          totalCartons: data.totalCartons,
          recordCount: data.records.length,
          sumActualLoadCounts: roundTo(sumActualLoadCounts, 8),
          sumExpectedLoadCounts: roundTo(sumExpectedLoadCounts, 8),
          containerSumValid: Math.abs(sumActualLoadCounts - 1) < 0.0001,
          records: containerRecords.map(r => ({
            id: r.id,
            cartons: r.cartons,
            actualLoadCount: r.actualLoadCount,
            expectedLoadCount: r.expectedLoadCount,
            difference: r.difference,
            isCorrect: r.isCorrect,
          })),
        };
      });

      const result = {
        etd,
        etdFormatted: formatDate(etd),
        etdKey: formatDateKey(etd),
        uniqueContainerCount,
        containerSumsValid,
        recordCount: records.length,
        incorrectRecordCount: incorrectRecords.length,
        records: recordsWithExpected,
        incorrectRecords,
        containerSummary,
      };

      validationResults.push(result);

      // Categorize issues
      if (!result.containerSumsValid) {
        const invalidContainers = result.containerSummary.filter(c => !c.containerSumValid);
        errors.push({
          type: 'CONTAINER_SUM_NOT_ONE',
          etd: result.etdFormatted,
          etdKey: result.etdKey,
          count: invalidContainers.length,
          containers: invalidContainers.map(c => ({
            container: c.container,
            sum: c.sumActualLoadCounts,
            expected: 1,
            difference: Math.abs(c.sumActualLoadCounts - 1),
          })),
        });
      }

      if (incorrectRecords.length > 0) {
        errors.push({
          type: 'INCORRECT_LOAD_COUNT',
          etd: result.etdFormatted,
          etdKey: result.etdKey,
          count: incorrectRecords.length,
          records: incorrectRecords.map(r => ({
            container: r.container,
            cartons: r.cartons,
            containerTotalCartons: r.containerTotalCartons,
            expected: r.expectedLoadCount,
            actual: r.actualLoadCount,
            difference: r.difference,
          })),
        });
      }
    }

    // Sort results by ETD date
    validationResults.sort((a, b) => a.etdKey.localeCompare(b.etdKey));

    // Calculate statistics
    const totalETDs = validationResults.length;
    const correctETDs = validationResults.filter(r => 
      r.containerSumsValid && 
      r.incorrectRecordCount === 0
    ).length;
    const incorrectETDs = totalETDs - correctETDs;

    // Print results
    console.log('='.repeat(100));
    console.log('📊 LOAD COUNT VALIDATION RESULTS');
    console.log('='.repeat(100));
    console.log('');

    // Summary Statistics
    console.log('📈 SUMMARY STATISTICS');
    console.log('-'.repeat(100));
    console.log(`  Total ETD dates analyzed:        ${totalETDs.toLocaleString()}`);
    console.log(`  ✅ Correct ETDs:                  ${correctETDs.toLocaleString()} (${((correctETDs/totalETDs)*100).toFixed(2)}%)`);
    console.log(`  ❌ Incorrect ETDs:                ${incorrectETDs.toLocaleString()} (${((incorrectETDs/totalETDs)*100).toFixed(2)}%)`);
    console.log(`  Total errors found:               ${errors.length.toLocaleString()}`);
    console.log(`  Total warnings found:             ${warnings.length.toLocaleString()}`);
    console.log('');

    // Errors by type
    if (errors.length > 0) {
      const errorsByType = {};
      errors.forEach(e => {
        errorsByType[e.type] = (errorsByType[e.type] || 0) + 1;
      });

      console.log('❌ ERRORS BY TYPE');
      console.log('-'.repeat(100));
      Object.entries(errorsByType).forEach(([type, count]) => {
        console.log(`  ${type.padEnd(30)} ${count.toString().padStart(5)} occurrences`);
      });
      console.log('');
    }

    // Top 20 ETDs with issues
    const problematicETDs = validationResults
      .filter(r => !r.containerSumsValid || r.incorrectRecordCount > 0)
      .sort((a, b) => {
        const aScore = (!a.containerSumsValid ? 10 : 0) + a.incorrectRecordCount;
        const bScore = (!b.containerSumsValid ? 10 : 0) + b.incorrectRecordCount;
        return bScore - aScore;
      })
      .slice(0, 20);

    if (problematicETDs.length > 0) {
      console.log('⚠️  TOP 20 ETDs WITH ISSUES');
      console.log('-'.repeat(100));
      problematicETDs.forEach((result, index) => {
        const issues = [];
        if (!result.containerSumsValid) {
          const invalidCount = result.containerSummary.filter(c => !c.containerSumValid).length;
          issues.push(`${invalidCount} containers don't sum to 1.0`);
        }
        if (result.incorrectRecordCount > 0) issues.push(`${result.incorrectRecordCount} incorrect records`);

        console.log(`  ${(index + 1).toString().padStart(2)}. ${result.etdFormatted.padEnd(30)} ${issues.join(' | ')}`);
      });
      console.log('');
    }

    // Detailed breakdown of first 10 problematic ETDs
    if (problematicETDs.length > 0) {
      console.log('🔍 DETAILED BREAKDOWN (First 5 Problematic ETDs)');
      console.log('-'.repeat(100));
      
      problematicETDs.slice(0, 5).forEach((result) => {
        console.log(`\n📅 ETD: ${result.etdFormatted} (${result.etdKey})`);
        console.log(`   Unique Containers: ${result.uniqueContainerCount}`);
        console.log(`   Container Sums Valid: ${result.containerSumsValid ? '✅' : '❌ (some containers don\'t sum to 1.0)'}`);
        console.log(`   Records with Incorrect Load Count: ${result.incorrectRecordCount}/${result.recordCount}`);

        if (result.incorrectRecords.length > 0) {
          console.log(`\n   ❌ Incorrect Records (first 10):`);
          result.incorrectRecords.slice(0, 10).forEach((r, idx) => {
            console.log(`      ${idx + 1}. Container: ${r.container.padEnd(15)} Cartons: ${r.cartons.toString().padStart(6)} Expected: ${r.expectedLoadCount.toFixed(8)} Actual: ${r.actualLoadCount.toFixed(8)} Diff: ${r.difference.toFixed(8)}`);
          });
        }

        // Show container breakdown
        console.log(`\n   📦 Container Breakdown (first 10):`);
        result.containerSummary
          .sort((a, b) => b.totalCartons - a.totalCartons)
          .slice(0, 10)
          .forEach((cont, idx) => {
            const allCorrect = cont.records.every(r => r.isCorrect);
            const sumValid = cont.containerSumValid;
            console.log(`      ${idx + 1}. ${cont.container.padEnd(15)} Total Cartons: ${cont.totalCartons.toString().padStart(6)} Sum LC: ${cont.sumActualLoadCounts.toFixed(8)} ${sumValid ? '✅' : '❌'} Records: ${cont.recordCount}`);
            if (!allCorrect || !sumValid) {
              cont.records.forEach((r, rIdx) => {
                if (!r.isCorrect) {
                  const expectedLC = (r.expectedLoadCount ?? 0).toFixed(8);
                  const actualLC = (r.actualLoadCount ?? 0).toFixed(8);
                  const diff = (r.difference ?? Math.abs((r.expectedLoadCount ?? 0) - (r.actualLoadCount ?? 0))).toFixed(8);
                  console.log(`         Record ${rIdx + 1} (ID: ${r.id}): Cartons=${r.cartons ?? 0} Expected LC=${expectedLC} Actual LC=${actualLC} Diff=${diff}`);
                }
              });
            }
          });
      });
      console.log('');
    }

    // Collect all containers with incorrect records for easy database search
    const allProblematicContainers = new Map(); // Map<"ETD|Container", {etd, container, issues}>
    
    validationResults.forEach(result => {
      // Containers with incorrect load count records
      result.incorrectRecords.forEach(record => {
        const key = `${result.etdKey}|${record.container}`;
        if (!allProblematicContainers.has(key)) {
          allProblematicContainers.set(key, {
            etd: result.etdKey,
            etdFormatted: result.etdFormatted,
            container: record.container,
            issueType: 'INCORRECT_LOAD_COUNT',
            recordCount: 0,
            recordIds: [],
          });
        }
        const entry = allProblematicContainers.get(key);
        entry.recordCount += 1;
        entry.recordIds.push(record.id);
      });

      // Containers where sum doesn't equal 1.0
      result.containerSummary
        .filter(c => !c.containerSumValid)
        .forEach(container => {
          const key = `${result.etdKey}|${container.container}`;
          if (!allProblematicContainers.has(key)) {
            allProblematicContainers.set(key, {
              etd: result.etdKey,
              etdFormatted: result.etdFormatted,
              container: container.container,
              issueType: 'CONTAINER_SUM_NOT_ONE',
              recordCount: 0,
              recordIds: [],
              sumActual: container.sumActualLoadCounts,
            });
          } else {
            const entry = allProblematicContainers.get(key);
            entry.issueType = 'BOTH'; // Has both issues
            entry.sumActual = container.sumActualLoadCounts;
          }
        });
    });

    // Display all problematic containers
    if (allProblematicContainers.size > 0) {
      console.log('🔍 ALL CONTAINERS WITH INCORRECT RECORDS (For Database Search)');
      console.log('='.repeat(100));
      console.log('');
      console.log('📋 Search these containers in your database:');
      console.log('');
      
      // Group by ETD for easier reading
      const containersByETD = new Map();
      Array.from(allProblematicContainers.values()).forEach(cont => {
        if (!containersByETD.has(cont.etd)) {
          containersByETD.set(cont.etd, []);
        }
        containersByETD.get(cont.etd).push(cont);
      });

      // Sort by ETD date
      const sortedETDs = Array.from(containersByETD.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      sortedETDs.forEach(([etd, containers]) => {
        const firstContainer = containers[0];
        console.log(`📅 ETD: ${firstContainer.etdFormatted} (${etd})`);
        containers.forEach(cont => {
          const issues = [];
          if (cont.issueType === 'INCORRECT_LOAD_COUNT' || cont.issueType === 'BOTH') {
            issues.push(`${cont.recordCount} incorrect record(s)`);
          }
          if (cont.issueType === 'CONTAINER_SUM_NOT_ONE' || cont.issueType === 'BOTH') {
            issues.push(`Sum=${cont.sumActual?.toFixed(8) || 'N/A'} (should be 1.0)`);
          }
          console.log(`   Container: ${cont.container.padEnd(20)} ${issues.join(' | ')}`);
        });
        console.log('');
      });

      // Also provide a simple list for copy-paste
      console.log('📋 SIMPLE LIST (Copy-paste for SQL WHERE clause):');
      console.log('-'.repeat(100));
      const containerList = Array.from(allProblematicContainers.values())
        .map(cont => `('${cont.etd}', '${cont.container}')`)
        .join(',\n   ');
      console.log(`   WHERE (etd, container) IN (\n   ${containerList}\n   )`);
      console.log('');
      
      // Also provide just container numbers for quick search
      console.log('📋 CONTAINER NUMBERS ONLY (For quick search):');
      console.log('-'.repeat(100));
      const uniqueContainers = [...new Set(Array.from(allProblematicContainers.values()).map(c => c.container))].sort();
      uniqueContainers.forEach((container, idx) => {
        if (idx > 0 && idx % 5 === 0) console.log('');
        process.stdout.write(`${container.padEnd(20)}`);
      });
      console.log('');
      console.log('');

      // Export problematic containers to a text file for easy reference
      const containersExportPath = join(__dirname, '../exports/problematic-containers.txt');
      const containersExportContent = [
        '='.repeat(100),
        'CONTAINERS WITH INCORRECT RECORDS - FOR DATABASE SEARCH',
        '='.repeat(100),
        '',
        `Total problematic containers: ${allProblematicContainers.size}`,
        `Generated: ${new Date().toISOString()}`,
        '',
        'SQL WHERE clause:',
        'WHERE (etd, container) IN (',
        ...Array.from(allProblematicContainers.values())
          .map(cont => `  ('${cont.etd}', '${cont.container}'),`)
          .map((line, idx, arr) => idx === arr.length - 1 ? line.replace(',', '') : line),
        ')',
        '',
        '='.repeat(100),
        'DETAILED LIST BY ETD:',
        '='.repeat(100),
        '',
        ...sortedETDs.flatMap(([etd, containers]) => {
          const firstContainer = containers[0];
          return [
            `ETD: ${firstContainer.etdFormatted} (${etd})`,
            ...containers.map(cont => {
              const issues = [];
              if (cont.issueType === 'INCORRECT_LOAD_COUNT' || cont.issueType === 'BOTH') {
                issues.push(`${cont.recordCount} incorrect record(s)`);
              }
              if (cont.issueType === 'CONTAINER_SUM_NOT_ONE' || cont.issueType === 'BOTH') {
                issues.push(`Sum=${cont.sumActual?.toFixed(8) || 'N/A'} (should be 1.0)`);
              }
              return `  Container: ${cont.container.padEnd(20)} ${issues.join(' | ')}`;
            }),
            '',
          ];
        }),
        '='.repeat(100),
        'CONTAINER NUMBERS ONLY:',
        '='.repeat(100),
        '',
        ...uniqueContainers.map(c => c),
        '',
      ].join('\n');

      // Ensure exports directory exists
      const exportsDir = join(__dirname, '../exports');
      try {
        mkdirSync(exportsDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      writeFileSync(containersExportPath, containersExportContent, 'utf-8');
      console.log('💾 Problematic containers list exported to:', containersExportPath);
      console.log('');
    }

    // Export to CSV if requested
    const shouldExport = process.argv.includes('--export') || process.argv.includes('-e');
    if (shouldExport) {
      const csvPath = join(__dirname, '../exports/load-count-validation.csv');
      
      // Create detailed CSV with all records
      const csvRows = [
        ['ETD', 'ETD Formatted', 'Container', 'Item', 'Supplier', 'Pack', 'Record Cartons', 'Container Total Cartons', 'Actual Load Count', 'Expected Load Count', 'Difference', 'Is Correct', 'Container Sum Valid'].join(',')
      ];

      validationResults.forEach(result => {
        result.records.forEach(record => {
          const containerSummary = result.containerSummary.find(c => c.container === record.container);
          csvRows.push([
            result.etdKey,
            `"${result.etdFormatted}"`,
            `"${record.container}"`,
            `"${record.item}"`,
            `"${record.supplier}"`,
            `"${record.pack}"`,
            record.cartons,
            record.containerTotalCartons,
            record.actualLoadCount,
            record.expectedLoadCount,
            record.difference,
            record.isCorrect ? 'YES' : 'NO',
            containerSummary?.containerSumValid ? 'YES' : 'NO',
          ].join(','));
        });
      });

      const csvContent = csvRows.join('\n');

      // Ensure exports directory exists
      const exportsDir = join(__dirname, '../exports');
      try {
        mkdirSync(exportsDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      writeFileSync(csvPath, csvContent, 'utf-8');
      console.log('💾 Detailed results exported to:', csvPath);
      console.log('');
    }

    // Export summary JSON if requested
    const shouldExportJSON = process.argv.includes('--json') || process.argv.includes('-j');
    if (shouldExportJSON) {
      const jsonPath = join(__dirname, '../exports/load-count-validation-summary.json');
      const jsonData = {
        summary: {
          totalETDs,
          correctETDs,
          incorrectETDs,
          errorCount: errors.length,
          warningCount: warnings.length,
        },
        errors: errors.slice(0, 100), // Limit to first 100 errors
        warnings: warnings.slice(0, 100), // Limit to first 100 warnings
        problematicETDs: problematicETDs.map(r => ({
          etd: r.etd,
          etdFormatted: r.etdFormatted,
          uniqueContainerCount: r.uniqueContainerCount,
          containerSumsValid: r.containerSumsValid,
          incorrectRecordCount: r.incorrectRecordCount,
          incorrectRecords: r.incorrectRecords.slice(0, 20), // Limit to first 20
          containerSummary: r.containerSummary.slice(0, 10), // Limit to first 10 containers
        })),
      };

      // Ensure exports directory exists
      const exportsDir = join(__dirname, '../exports');
      try {
        mkdirSync(exportsDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log('💾 Summary JSON exported to:', jsonPath);
      console.log('');
    }

    console.log('='.repeat(100));
    console.log('✅ Validation completed!');
    console.log('='.repeat(100));
    console.log('');
    console.log('💡 Usage tips:');
    console.log('  - Add --export or -e flag to export detailed results to CSV');
    console.log('  - Add --json or -j flag to export summary to JSON');
    console.log('');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation
validateLoadCount();

