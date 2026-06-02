import { FruitType } from '@/types/shipping';

export function getInvoicePrefix(item: FruitType): 'B' | 'P' {
  return item === 'BANANAS' ? 'B' : 'P';
}

export function validateInvoiceNumber(
  invoiceNo: string,
  item: FruitType,
  year: number
): { valid: boolean; message?: string } {
  const trimmed = invoiceNo.trim().toUpperCase();
  if (!trimmed) {
    return { valid: true };
  }

  const prefix = getInvoicePrefix(item);
  const pattern = new RegExp(`^${prefix}${year}\\d{3}$`);

  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      message: `Invoice number must be ${prefix}${year}### (e.g. ${prefix}${year}001) for ${item.toLowerCase()}.`,
    };
  }

  return { valid: true };
}

export function normalizeInvoiceNumber(invoiceNo: string | null | undefined): string | null {
  if (!invoiceNo || invoiceNo.trim() === '') return null;
  return invoiceNo.trim().toUpperCase();
}
