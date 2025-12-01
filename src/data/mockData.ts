import { ShippingRecord } from '@/types/shipping';

const suppliers = ['AGS PANABO', 'AGS SARAP', 'AGS TUPI', 'APR AGRI', 'LAPANDAY', 'MARSMAN', 'MARSMAN 2', 'NEW TOWN FRESH', 'PHILPACK'];
const sLines = ['CMA', 'MSC', 'ONE', 'PIL'];
const pols = ['DVO', 'GES'];
const bananaPacks = ['13.5 KG A', '13.5 KG B', '13.5 KG SH', '7.2 KG A', '3 KG A', '18 KG A'];
const pineapplePacks = ['12KG PACK'];

function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function randomContainer(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${number}`;
}

function generateRecords(): ShippingRecord[] {
  const records: ShippingRecord[] = [];
  
  // Generate banana records
  for (let year = 2024; year <= 2025; year++) {
    for (let week = 1; week <= (year === 2025 ? 14 : 52); week++) {
      const numRecords = Math.floor(3 + Math.random() * 8);
      for (let i = 0; i < numRecords; i++) {
        const month = Math.ceil(week / 4.33);
        const day = Math.floor(1 + Math.random() * 28);
        records.push({
          id: randomId(),
          year,
          week,
          etd: `${month}/${day}/${year}`,
          pol: pols[Math.floor(Math.random() * pols.length)],
          item: 'BANANAS',
          destination: 'DAMMAM',
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          sLine: sLines[Math.floor(Math.random() * sLines.length)],
          container: randomContainer(),
          pack: bananaPacks[Math.floor(Math.random() * bananaPacks.length)],
          lCont: Math.random() < 0.3 ? 1 : parseFloat((Math.random() * 0.9 + 0.1).toFixed(8)),
          cartons: Math.floor(200 + Math.random() * 1500),
          price: parseFloat((8 + Math.random() * 1.5).toFixed(2)),
        });
      }
    }
  }

  // Generate pineapple records
  for (let year = 2024; year <= 2025; year++) {
    for (let week = 1; week <= (year === 2025 ? 14 : 52); week++) {
      const numRecords = Math.floor(1 + Math.random() * 3);
      for (let i = 0; i < numRecords; i++) {
        const month = Math.ceil(week / 4.33);
        const day = Math.floor(1 + Math.random() * 28);
        records.push({
          id: randomId(),
          year,
          week,
          etd: `${month}/${day}/${year}`,
          pol: pols[Math.floor(Math.random() * pols.length)],
          item: 'PINEAPPLES',
          destination: 'DAMMAM',
          supplier: 'LAPANDAY',
          sLine: sLines[Math.floor(Math.random() * sLines.length)],
          container: randomContainer(),
          pack: pineapplePacks[0],
          lCont: 1,
          cartons: Math.floor(1000 + Math.random() * 2000),
          price: parseFloat((7 + Math.random() * 2).toFixed(2)),
        });
      }
    }
  }

  return records;
}

export const initialMockData = generateRecords();

export function getUniqueYears(data: ShippingRecord[]): number[] {
  return [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
}

export function getUniqueWeeks(data: ShippingRecord[]): number[] {
  return [...new Set(data.map(r => r.week))].sort((a, b) => a - b);
}

export function getUniqueSuppliers(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.supplier))].sort();
}

export function getUniqueSLines(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.sLine))].sort();
}

export function getUniquePols(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.pol))].sort();
}

export function getUniquePacks(data: ShippingRecord[]): string[] {
  return [...new Set(data.map(r => r.pack))].sort();
}
