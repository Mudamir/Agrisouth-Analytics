import { useState, useEffect, useMemo } from 'react';
import { ShippingRecord, FruitType, FilterState, PackStats } from '@/types/shipping';
import { initialMockData, getUniqueYears, getUniqueWeeks, getUniqueSuppliers, getUniqueSLines, getUniquePols } from '@/data/mockData';

const STORAGE_KEY = 'agsouth_shipping_data';

export function useShippingData() {
  const [data, setData] = useState<ShippingRecord[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initialMockData;
      }
    }
    return initialMockData;
  });

  const [selectedFruit, setSelectedFruit] = useState<FruitType>('BANANAS');
  const [filters, setFilters] = useState<FilterState>({
    year: 2025,
    weeks: [],
    suppliers: [],
    sLines: [],
    pols: [],
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const fruitData = useMemo(() => {
    return data.filter(r => r.item === selectedFruit);
  }, [data, selectedFruit]);

  const filteredData = useMemo(() => {
    return fruitData.filter(record => {
      if (filters.year && record.year !== filters.year) return false;
      if (filters.weeks.length > 0 && !filters.weeks.includes(record.week)) return false;
      if (filters.suppliers.length > 0 && !filters.suppliers.includes(record.supplier)) return false;
      if (filters.sLines.length > 0 && !filters.sLines.includes(record.sLine)) return false;
      if (filters.pols.length > 0 && !filters.pols.includes(record.pol)) return false;
      return true;
    });
  }, [fruitData, filters]);

  const years = useMemo(() => getUniqueYears(data), [data]);
  const weeks = useMemo(() => getUniqueWeeks(fruitData), [fruitData]);
  const suppliers = useMemo(() => getUniqueSuppliers(fruitData), [fruitData]);
  const sLines = useMemo(() => getUniqueSLines(fruitData), [fruitData]);
  const pols = useMemo(() => getUniquePols(fruitData), [fruitData]);

  const packStats = useMemo((): PackStats[] => {
    const statsMap = new Map<string, { containers: number; cartons: number }>();
    
    filteredData.forEach(record => {
      const existing = statsMap.get(record.pack) || { containers: 0, cartons: 0 };
      statsMap.set(record.pack, {
        containers: existing.containers + record.lCont,
        cartons: existing.cartons + record.cartons,
      });
    });

    return Array.from(statsMap.entries()).map(([pack, stats]) => ({
      pack,
      containers: parseFloat(stats.containers.toFixed(2)),
      cartons: stats.cartons,
    })).sort((a, b) => b.cartons - a.cartons);
  }, [filteredData]);

  const totalStats = useMemo(() => {
    return filteredData.reduce(
      (acc, record) => ({
        containers: acc.containers + record.lCont,
        cartons: acc.cartons + record.cartons,
      }),
      { containers: 0, cartons: 0 }
    );
  }, [filteredData]);

  const supplierStats = useMemo(() => {
    const statsMap = new Map<string, { containers: number; cartons: number }>();
    
    filteredData.forEach(record => {
      const existing = statsMap.get(record.supplier) || { containers: 0, cartons: 0 };
      statsMap.set(record.supplier, {
        containers: existing.containers + record.lCont,
        cartons: existing.cartons + record.cartons,
      });
    });

    return Array.from(statsMap.entries()).map(([supplier, stats]) => ({
      supplier,
      containers: parseFloat(stats.containers.toFixed(2)),
      cartons: stats.cartons,
    })).sort((a, b) => b.cartons - a.cartons);
  }, [filteredData]);

  const addRecord = (record: Omit<ShippingRecord, 'id'>) => {
    const newRecord: ShippingRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 15),
    };
    setData(prev => [...prev, newRecord]);
  };

  const deleteRecord = (id: string) => {
    setData(prev => prev.filter(r => r.id !== id));
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'weeks' | 'suppliers' | 'sLines' | 'pols', value: string | number) => {
    setFilters(prev => {
      const current = prev[key] as (string | number)[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
  };

  const clearFilters = () => {
    setFilters({
      year: filters.year,
      weeks: [],
      suppliers: [],
      sLines: [],
      pols: [],
    });
  };

  return {
    data,
    filteredData,
    selectedFruit,
    setSelectedFruit,
    filters,
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    years,
    weeks,
    suppliers,
    sLines,
    pols,
    packStats,
    totalStats,
    supplierStats,
    addRecord,
    deleteRecord,
  };
}
