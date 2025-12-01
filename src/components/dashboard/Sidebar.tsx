import { FruitType } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { TrendingUp, BarChart3, Database, Mail, Banana, Cherry } from 'lucide-react';

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
    <aside className="w-48 sidebar-modern flex flex-col min-h-screen p-4 gap-4 relative z-10">
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-primary-foreground/70">AGSouth</span>
          <span className="text-sm font-bold text-primary-foreground font-heading">Pacific</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        <button
          onClick={() => {
            onSelectFruit('BANANAS');
            onNavigate('dashboard');
          }}
          className={cn(
            'nav-button flex items-center gap-3',
            selectedFruit === 'BANANAS' && currentPage === 'dashboard' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          <Banana className="w-4 h-4" />
          <span>Bananas</span>
        </button>
        
        <button
          onClick={() => {
            onSelectFruit('PINEAPPLES');
            onNavigate('dashboard');
          }}
          className={cn(
            'nav-button flex items-center gap-3',
            selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          <Cherry className="w-4 h-4" />
          <span>Pineapples</span>
        </button>

        <div className="h-px bg-primary-foreground/10 my-2" />
        
        <button
          onClick={() => onNavigate('analysis')}
          className={cn(
            'nav-button flex items-center gap-3',
            currentPage === 'analysis' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analysis</span>
        </button>
        
        <button
          onClick={() => onNavigate('data')}
          className={cn(
            'nav-button flex items-center gap-3',
            currentPage === 'data' ? 'nav-button-active' : 'nav-button-inactive'
          )}
        >
          <Database className="w-4 h-4" />
          <span>Data</span>
        </button>
      </nav>

      {/* Summary Cards */}
      <div className="mt-auto space-y-3">
        <div className="summary-card animate-fade-in">
          <p className="text-[10px] font-medium text-primary-foreground/60 uppercase tracking-wider">Current Selection</p>
          <div className="mt-3 space-y-2">
            <div>
              <p className="text-[10px] text-primary-foreground/70">Containers</p>
              <p className="text-xl font-bold font-heading text-primary-foreground">{totalContainers.toLocaleString()}</p>
            </div>
            <div className="h-px bg-primary-foreground/10" />
            <div>
              <p className="text-[10px] text-primary-foreground/70">Cartons</p>
              <p className="text-xl font-bold font-heading text-accent">{totalCartons.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <button className="w-full p-3 rounded-xl bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-all duration-300 border border-primary-foreground/10 group">
          <Mail className="w-5 h-5 mx-auto text-primary-foreground/70 group-hover:text-primary-foreground transition-colors" />
        </button>
      </div>
    </aside>
  );
}
