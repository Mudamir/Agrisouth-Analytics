import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { DataView } from '@/components/dashboard/DataView';
import { AnalysisView } from '@/components/dashboard/AnalysisView';
import { PNLView } from '@/components/dashboard/PNLView';
import { UserManagement } from '@/components/admin/UserManagement';
import { ConfigurationManagement } from '@/components/admin/ConfigurationManagement';
import { DataLogs } from '@/components/admin/DataLogs';
import { useShippingData } from '@/hooks/useShippingData';
import { useAuth } from '@/contexts/AuthContext';

type Page = 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { canAccessPage, userPermissions } = useAuth();

  // Redirect if user tries to access a page they don't have permission for
  // Also re-check when permissions change
  useEffect(() => {
    if (!canAccessPage(currentPage)) {
      // Redirect to dashboard if they don't have access
      setCurrentPage('dashboard');
    }
  }, [currentPage, canAccessPage, userPermissions]); // Added userPermissions to dependencies
  
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
    destinations,
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
          data={data || []}
          filteredData={filteredData || []}
          filters={filters}
        />
      )}

      {currentPage === 'analysis' && (
        <AnalysisView 
          data={filteredData || []}
          selectedFruit={selectedFruit}
          onSelectFruit={setSelectedFruit}
        />
      )}

      {currentPage === 'data' && (
        <DataView
          data={data}
          onAdd={addRecord}
          onDelete={deleteRecord}
        />
      )}

      {currentPage === 'pnl' && canAccessPage('pnl') && (
        <PNLView 
          data={data || []} 
          selectedFruit={selectedFruit}
          onSelectFruit={setSelectedFruit}
        />
      )}

      {currentPage === 'users' && canAccessPage('users') && (
        <div className="flex-1 overflow-auto">
          <UserManagement />
        </div>
      )}

      {currentPage === 'data-logs' && canAccessPage('data-logs') && (
        <div className="flex-1 overflow-auto">
          <DataLogs />
        </div>
      )}

      {currentPage === 'configuration' && canAccessPage('configuration') && (
        <div className="flex-1 overflow-auto">
          <ConfigurationManagement />
        </div>
      )}

      {/* Right Filter Panel - on dashboard and analysis */}
      {(currentPage === 'dashboard' || currentPage === 'analysis') && (
        <FilterPanel
          filters={filters}
          years={years}
          weeks={weeks}
          suppliers={suppliers}
          sLines={sLines}
          pols={pols}
          destinations={destinations}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
};

export default Index;
