import { FruitType } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { Apple, BarChart3, Database, Mail } from 'lucide-react';

interface SidebarProps {
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
  currentPage: 'dashboard' | 'analysis' | 'data';
  onNavigate: (page: 'dashboard' | 'analysis' | 'data') => void;
  totalContainers: number;
  totalCartons: number;
}

export function Sidebar({ 
  selectedFruit, 
  onSelectFruit, 
  currentPage, 
  onNavigate,
  totalContainers,
  totalCartons,
}: SidebarProps) {
  return (
    <aside className="w-40 bg-primary flex flex-col min-h-screen p-3 gap-3">
      <nav className="flex flex-col gap-2">
        <button
          onClick={() => {
            onSelectFruit('BANANAS');
            onNavigate('dashboard');
          }}
          className={cn(
            'nav-button',
            selectedFruit === 'BANANAS' && currentPage === 'dashboard' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          BANANAS
        </button>
        
        <button
          onClick={() => onNavigate('analysis')}
          className={cn(
            'nav-button',
            currentPage === 'analysis' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          ANALYSIS
        </button>
        
        <button
          onClick={() => onNavigate('data')}
          className={cn(
            'nav-button',
            currentPage === 'data' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          DATA
        </button>
        
        <button
          onClick={() => {
            onSelectFruit('PINEAPPLES');
            onNavigate('dashboard');
          }}
          className={cn(
            'nav-button',
            selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          PINEAPPLES
        </button>
      </nav>

      <div className="mt-auto space-y-2">
        <div className="summary-card">
          <p className="text-xs font-medium opacity-80">Summary*</p>
          <p className="stat-card-label mt-2">Number of Containers Shipped</p>
          <p className="text-xl font-bold font-heading text-coral">{totalContainers.toLocaleString()}</p>
        </div>
        
        <div className="summary-card">
          <p className="stat-card-label">Number of Cartons Shipped</p>
          <p className="text-xl font-bold font-heading text-coral">{totalCartons.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">* Current selection</p>
        </div>

        <button className="w-full p-2 bg-primary/50 rounded-lg hover:bg-primary/70 transition-colors">
          <Mail className="w-6 h-6 mx-auto text-primary-foreground opacity-80" />
        </button>
      </div>
    </aside>
  );
}
