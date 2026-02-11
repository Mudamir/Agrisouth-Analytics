import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ShippingRecord } from '@/types/shipping';
import { logger } from '@/lib/logger';

interface InvoiceData {
  records: ShippingRecord[];
  invoiceNo: string;
  invoiceDate: string;
}

const transformRecord = (record: any): ShippingRecord => {
  return {
    id: record.id,
    year: record.year,
    week: record.week,
    etd: record.etd,
    pol: record.pol,
    item: record.item,
    destination: record.destination,
    supplier: record.supplier,
    sLine: record.s_line,
    container: record.container,
    pack: record.pack,
    lCont: record.l_cont,
    cartons: record.cartons,
    type: record.type,
    eta: record.eta,
    vessel: record.vessel,
    invoiceNo: record.invoice_no,
    invoiceDate: record.invoice_date,
    customerName: record.customer_name,
    billingNo: record.billing_no,
  };
};

export const useInvoiceData = (invoiceNo: string | null) => {
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['invoice-data', invoiceNo],
    queryFn: async (): Promise<InvoiceData | null> => {
      if (!invoiceNo || !supabase) {
        return null;
      }

      try {
        setError(null);

        // Fetch all records with this invoice number
        const { data, error: fetchError } = await supabase
          .from('shipping_records')
          .select('*')
          .eq('invoice_no', invoiceNo)
          .order('container', { ascending: true });

        if (fetchError) {
          logger.safeError('Error fetching invoice data', fetchError);
          setError(fetchError.message);
          throw fetchError;
        }

        if (!data || data.length === 0) {
          setError('No records found for this invoice number');
          return null;
        }

        const transformedRecords = data.map(transformRecord);

        // Get invoice date from first record
        const invoiceDate = transformedRecords[0].invoiceDate || '';

        return {
          records: transformedRecords,
          invoiceNo,
          invoiceDate,
        };
      } catch (err) {
        logger.safeError('Error in useInvoiceData', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      }
    },
    enabled: !!invoiceNo && !!supabase,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    error: error || query.error,
  };
};

// Hook to get all unique invoice numbers for dropdown with filtering
export const useInvoiceNumbers = (year?: number | null, week?: number | null, searchTerm?: string) => {
  return useQuery({
    queryKey: ['invoice-numbers', year, week, searchTerm],
    queryFn: async (): Promise<string[]> => {
      if (!supabase) {
        return [];
      }

      try {
        let query = supabase
          .from('shipping_records')
          .select('invoice_no, year, week')
          .not('invoice_no', 'is', null);

        // Apply filters
        if (year) {
          query = query.eq('year', year);
        }
        if (week) {
          query = query.eq('week', week);
        }
        if (searchTerm && searchTerm.trim()) {
          query = query.ilike('invoice_no', `%${searchTerm.trim()}%`);
        }

        const { data, error } = await query.order('invoice_no', { ascending: false });

        if (error) {
          logger.safeError('Error fetching invoice numbers', error);
          throw error;
        }

        // Get unique invoice numbers
        const uniqueInvoices = [...new Set(data.map(record => record.invoice_no))];
        return uniqueInvoices.filter(Boolean) as string[];
      } catch (err) {
        logger.safeError('Error in useInvoiceNumbers', err);
        throw err;
      }
    },
    enabled: !!supabase,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to fetch sales prices for invoice items
export const useSalesPrices = (records: ShippingRecord[]) => {
  return useQuery({
    queryKey: ['sales-prices', records.map(r => `${r.item}-${r.pack}-${r.supplier}-${r.year}`).join(',')],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || records.length === 0) {
        return new Map();
      }

      try {
        const priceMap = new Map<string, number>();
        
        // Get unique combinations
        const uniqueCombos = Array.from(new Set(
          records.map(r => ({
            item: r.item,
            pack: r.pack,
            supplier: r.supplier || null,
            year: r.year,
            key: `${r.item}|${r.pack}|${r.supplier || ''}|${r.year}`
          }))
        ));

        // Get unique items, packs, years
        const items = [...new Set(uniqueCombos.map(c => c.item))];
        const packs = [...new Set(uniqueCombos.map(c => c.pack))];
        const years = [...new Set(uniqueCombos.map(c => c.year))];

        // Batch fetch all sales prices for these items/packs/years
        const { data: allPrices, error } = await supabase
          .from('sales_prices')
          .select('item, pack, supplier, year, sales_price')
          .in('item', items)
          .in('pack', packs)
          .in('year', years);

        if (error) {
          logger.safeError('Error fetching sales prices', error);
          return new Map();
        }

        // Build price map - prioritize supplier-specific, then uniform
        for (const combo of uniqueCombos) {
          // Try supplier-specific first
          if (combo.supplier) {
            const supplierPrice = allPrices?.find(
              p => p.item === combo.item && 
                   p.pack === combo.pack && 
                   p.supplier === combo.supplier && 
                   p.year === combo.year
            );
            if (supplierPrice) {
              priceMap.set(combo.key, supplierPrice.sales_price);
              continue;
            }
          }

          // Fallback to uniform pricing
          const uniformPrice = allPrices?.find(
            p => p.item === combo.item && 
                 p.pack === combo.pack && 
                 p.supplier === null && 
                 p.year === combo.year
          );
          if (uniformPrice) {
            priceMap.set(combo.key, uniformPrice.sales_price);
          }
        }

        return priceMap;
      } catch (err) {
        logger.safeError('Error fetching sales prices', err);
        return new Map();
      }
    },
    enabled: records.length > 0 && !!supabase,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook to fetch purchase prices for invoice items
export const usePurchasePrices = (records: ShippingRecord[]) => {
  return useQuery({
    queryKey: ['purchase-prices', records.map(r => `${r.item}-${r.pack}-${r.supplier}-${r.year}`).join(',')],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || records.length === 0) {
        return new Map();
      }

      try {
        const priceMap = new Map<string, number>();
        
        // Get unique combinations
        const uniqueCombos = Array.from(new Set(
          records.map(r => ({
            item: r.item,
            pack: r.pack,
            supplier: r.supplier || null,
            year: r.year,
            key: `${r.item}|${r.pack}|${r.supplier || ''}|${r.year}`
          }))
        ));

        // Get unique items, packs, suppliers, years
        const items = [...new Set(uniqueCombos.map(c => c.item))];
        const packs = [...new Set(uniqueCombos.map(c => c.pack))];
        const suppliers = [...new Set(uniqueCombos.map(c => c.supplier).filter(Boolean))];
        const years = [...new Set(uniqueCombos.map(c => c.year))];

        // Batch fetch all purchase prices
        let query = supabase
          .from('purchase_prices')
          .select('item, pack, supplier, year, purchase_price')
          .in('item', items)
          .in('pack', packs)
          .in('year', years);

        if (suppliers.length > 0) {
          query = query.in('supplier', suppliers);
        }

        const { data: allPrices, error } = await query;

        if (error) {
          logger.safeError('Error fetching purchase prices', error);
          return new Map();
        }

        // Build price map
        for (const combo of uniqueCombos) {
          if (combo.supplier) {
            const price = allPrices?.find(
              p => p.item === combo.item && 
                   p.pack === combo.pack && 
                   p.supplier === combo.supplier && 
                   p.year === combo.year
            );
            if (price) {
              priceMap.set(combo.key, price.purchase_price);
            }
          }
        }

        return priceMap;
      } catch (err) {
        logger.safeError('Error fetching purchase prices', err);
        return new Map();
      }
    },
    enabled: records.length > 0 && !!supabase,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

