import { FruitType } from '@/types/shipping';
import { PriceRow } from '@/hooks/usePrices';

export interface PriceMaps {
  salesPriceMap: Map<string, number>;
  salesPricesByPackSupplier: Map<string, number>;
  purchasePriceMap: Map<string, number>;
  priceConfig: Map<string, { sales: number; purchase: number }>;
}

export function filterPricesForPnl(
  prices: PriceRow[],
  selectedFruit: FruitType,
  selectedYear: number | 'ALL',
  dataYears: number[]
): PriceRow[] {
  return prices.filter((price) => {
    if (price.item !== selectedFruit) return false;
    if (selectedYear !== 'ALL') {
      return price.year === selectedYear;
    }
    return dataYears.length === 0 || dataYears.includes(price.year);
  });
}

export function buildPriceMaps(
  prices: PriceRow[],
  selectedYear: number | 'ALL'
): PriceMaps {
  const salesData = prices.filter((p) => p.price_type === 'sales');
  const purchaseData = prices.filter((p) => p.price_type === 'purchase');

  const salesPriceMap = new Map<string, number>();
  const salesPricesByPackSupplier = new Map<string, number>();

  salesData.forEach((sp) => {
    if (sp.supplier == null || sp.supplier === '') {
      salesPriceMap.set(`${sp.pack}|${sp.year}`, sp.price);
    } else {
      salesPricesByPackSupplier.set(`${sp.pack}|${sp.supplier}|${sp.year}`, sp.price);
    }
  });

  const purchasePriceMap = new Map<string, number>();
  purchaseData.forEach((pp) => {
    purchasePriceMap.set(`${pp.pack}|${pp.supplier}|${pp.year}`, pp.price);
  });

  const priceConfig = new Map<string, { sales: number; purchase: number }>();

  if (selectedYear !== 'ALL') {
    const allPacks = new Set<string>();
    salesData.forEach((sp) => {
      if (sp.year === selectedYear) allPacks.add(sp.pack);
    });
    purchaseData.forEach((pp) => {
      if (pp.year === selectedYear) allPacks.add(pp.pack);
    });

    allPacks.forEach((pack) => {
      const suppliersForPack = new Set<string>();
      purchaseData.forEach((pp) => {
        if (pp.pack === pack && pp.year === selectedYear) suppliersForPack.add(pp.supplier);
      });
      salesData.forEach((sp) => {
        if (sp.pack === pack && sp.supplier && sp.year === selectedYear) {
          suppliersForPack.add(sp.supplier);
        }
      });

      if (suppliersForPack.size === 0) {
        const uniformSalesPrice = salesPriceMap.get(`${pack}|${selectedYear}`) || 0;
        priceConfig.set(`${pack}|*`, { sales: uniformSalesPrice, purchase: 0 });
      } else {
        suppliersForPack.forEach((supplier) => {
          const salesPrice =
            salesPricesByPackSupplier.get(`${pack}|${supplier}|${selectedYear}`) ||
            salesPriceMap.get(`${pack}|${selectedYear}`) ||
            0;
          const purchasePrice =
            purchasePriceMap.get(`${pack}|${supplier}|${selectedYear}`) || 0;
          priceConfig.set(`${pack}|${supplier}`, { sales: salesPrice, purchase: purchasePrice });
        });
      }
    });
  }

  return {
    salesPriceMap,
    salesPricesByPackSupplier,
    purchasePriceMap,
    priceConfig,
  };
}
