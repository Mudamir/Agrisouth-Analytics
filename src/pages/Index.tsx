import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { DataView } from '@/components/dashboard/DataView';
import { AnalysisView } from '@/components/dashboard/AnalysisView';
import { useShippingData } from '@/hooks/useShippingData';

type Page = 'dashboard' | 'analysis' | 'data';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  
  const {
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
  } = useShippingData();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <Sidebar
        selectedFruit={selectedFruit}
        onSelectFruit={setSelectedFruit}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        totalContainers={Math.round(totalStats.containers)}
        totalCartons={totalStats.cartons}
      />

      {/* Main Content */}
      {currentPage === 'dashboard' && (
        <DashboardView
          fruit={selectedFruit}
          packStats={packStats}
          totalStats={totalStats}
          supplierStats={supplierStats}
        />
      )}

      {currentPage === 'analysis' && (
        <AnalysisView data={data} />
      )}

      {currentPage === 'data' && (
        <DataView
          data={data}
          onAdd={addRecord}
          onDelete={deleteRecord}
        />
      )}

      {/* Right Filter Panel - only on dashboard */}
      {currentPage === 'dashboard' && (
        <FilterPanel
          filters={filters}
          years={years}
          weeks={weeks}
          suppliers={suppliers}
          sLines={sLines}
          pols={pols}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
};

export default Index;
