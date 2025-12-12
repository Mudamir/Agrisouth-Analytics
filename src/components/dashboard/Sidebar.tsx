import { useState } from 'react';
import { FruitType } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Database, 
  Mail, 
  Banana,
  TreePine,
  TrendingUp,
  Package,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  Settings,
  Cog,
  FileText
} from 'lucide-react';
import { Logo } from './Logo';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
  currentPage: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs';
  onNavigate: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs') => void;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, canAccessPage, canAccessUserManagement, canAccessPNL, canAccessConfiguration } = useAuth();
  const canAccessDataLogs = canAccessPage('data-logs'); // Independent permission check

  return (
    <aside className={cn(
      "bg-gradient-to-b from-primary via-primary to-secondary flex flex-col min-h-screen border-r border-primary/20 shadow-xl transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-56"
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-primary border-2 border-primary-foreground/20 shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-primary-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-primary-foreground" />
        )}
      </button>

      {/* Logo Section */}
      <div className={cn(
        "border-b border-primary/20 transition-all duration-300",
        isCollapsed ? "p-4" : "p-6 pb-5"
      )}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
              <img 
                src={logoImage} 
                alt="Agrisouth Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
          </div>
        ) : (
          <Logo />
        )}
      </div>

      {/* Navigation Section */}
      <nav className={cn(
        "flex-1 py-6 space-y-1.5 overflow-y-auto sidebar-scroll transition-all duration-300",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <div className="mb-4">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider px-3 mb-2">
              Products
            </p>
          )}
          
          <button
            onClick={() => {
              onSelectFruit('BANANAS');
              onNavigate('dashboard');
            }}
            className={cn(
              'w-full flex items-center rounded-lg transition-all duration-200 group relative',
              isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              selectedFruit === 'BANANAS' && currentPage === 'dashboard'
                ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
            )}
            title={isCollapsed ? "Bananas" : undefined}
          >
            <Banana className={cn(
              'transition-transform duration-200 flex-shrink-0',
              isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
              selectedFruit === 'BANANAS' && currentPage === 'dashboard' 
                ? 'scale-110' 
                : 'group-hover:scale-105'
            )} />
            {!isCollapsed && (
              <span className="font-semibold text-sm">Bananas</span>
            )}
          </button>
          
          <button
            onClick={() => {
              onSelectFruit('PINEAPPLES');
              onNavigate('dashboard');
            }}
            className={cn(
              'w-full flex items-center rounded-lg transition-all duration-200 group relative',
              isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard'
                ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
            )}
            title={isCollapsed ? "Pineapples" : undefined}
          >
            <TreePine className={cn(
              'transition-transform duration-200 flex-shrink-0',
              isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
              selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard' 
                ? 'scale-110' 
                : 'group-hover:scale-105'
            )} />
            {!isCollapsed && (
              <span className="font-semibold text-sm">Pineapples</span>
            )}
          </button>
        </div>

        <div className="pt-2 border-t border-primary/20">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider px-3 mb-2">
              Views
            </p>
          )}
          
          <button
            onClick={() => onNavigate('analysis')}
            className={cn(
              'w-full flex items-center rounded-lg transition-all duration-200 group relative',
              isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              currentPage === 'analysis'
                ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
            )}
            title={isCollapsed ? "Analysis" : undefined}
          >
            <TrendingUp className={cn(
              'transition-transform duration-200 flex-shrink-0',
              isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
              currentPage === 'analysis' 
                ? 'scale-110' 
                : 'group-hover:scale-105'
            )} />
            {!isCollapsed && (
              <span className="font-semibold text-sm">Analysis</span>
            )}
          </button>
          
          <button
            onClick={() => onNavigate('data')}
            className={cn(
              'w-full flex items-center rounded-lg transition-all duration-200 group relative',
              isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              currentPage === 'data'
                ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
            )}
            title={isCollapsed ? "Data" : undefined}
          >
            <Database className={cn(
              'transition-transform duration-200 flex-shrink-0',
              isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
              currentPage === 'data' 
                ? 'scale-110' 
                : 'group-hover:scale-105'
            )} />
            {!isCollapsed && (
              <span className="font-semibold text-sm">Data</span>
            )}
          </button>
          
          {canAccessPNL && (
            <button
              onClick={() => onNavigate('pnl')}
              className={cn(
                'w-full flex items-center rounded-lg transition-all duration-200 group relative',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                currentPage === 'pnl'
                  ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                  : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
              )}
              title={isCollapsed ? "PNL" : undefined}
            >
              <DollarSign className={cn(
                'transition-transform duration-200 flex-shrink-0',
                isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
                currentPage === 'pnl' 
                  ? 'scale-110' 
                  : 'group-hover:scale-105'
              )} />
              {!isCollapsed && (
                <span className="font-semibold text-sm">PNL</span>
              )}
            </button>
          )}
        </div>

        {(canAccessUserManagement || canAccessConfiguration || canAccessDataLogs) && (
          <div className="pt-2 border-t border-primary/20">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-primary-foreground/50 uppercase tracking-wider px-3 mb-2">
                Settings
              </p>
            )}
            
            {canAccessUserManagement && (
              <button
                onClick={() => onNavigate('users')}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                  currentPage === 'users'
                    ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                    : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
                )}
                title={isCollapsed ? "User Management" : undefined}
              >
                <Users className={cn(
                  'transition-transform duration-200 flex-shrink-0',
                  isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
                  currentPage === 'users' 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                )} />
                {!isCollapsed && (
                  <span className="font-semibold text-sm">User Management</span>
                )}
              </button>
            )}

            {canAccessDataLogs && (
              <button
                onClick={() => onNavigate('data-logs')}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                  currentPage === 'data-logs'
                    ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                    : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
                )}
                title={isCollapsed ? "Data Logs" : undefined}
              >
                <FileText className={cn(
                  'transition-transform duration-200 flex-shrink-0',
                  isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
                  currentPage === 'data-logs' 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                )} />
                {!isCollapsed && (
                  <span className="font-semibold text-sm">Data Logs</span>
                )}
              </button>
            )}
            
            {canAccessConfiguration && (
              <button
                onClick={() => onNavigate('configuration')}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-200 group relative',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                  currentPage === 'configuration'
                    ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                    : 'text-primary-foreground/80 hover:bg-primary/60 hover:text-primary-foreground'
                )}
                title={isCollapsed ? "Configuration" : undefined}
              >
                <Cog className={cn(
                  'transition-transform duration-200 flex-shrink-0',
                  isCollapsed ? 'w-5 h-5' : 'w-5 h-5',
                  currentPage === 'configuration' 
                    ? 'scale-110' 
                    : 'group-hover:scale-105'
                )} />
                {!isCollapsed && (
                  <span className="font-semibold text-sm">Configuration</span>
                )}
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Summary Section */}
      <div className={cn(
        "border-t border-primary/20 bg-primary/30 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "p-2" : "p-4 space-y-3"
      )}>
        {!isCollapsed && (
          <>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-primary-foreground/70" />
                <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wide">
                  Containers
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-accent">
                {totalContainers.toLocaleString()}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary-foreground/70" />
                <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wide">
                  Cartons
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-accent">
                {totalCartons.toLocaleString()}
              </p>
              <p className="text-xs text-primary-foreground/50 mt-2 italic">
                * Based on current filters
              </p>
            </div>
          </>
        )}

        <div className={cn(
          "flex gap-2",
          isCollapsed ? "flex-col" : "flex-row"
        )}>
          <a 
            href="https://outlook.office.com/mail/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-200 hover:shadow-lg group block",
              isCollapsed ? "p-2" : "flex-1 p-3"
            )}
            title={isCollapsed ? "Email" : undefined}
          >
            <Mail className={cn(
              "text-primary-foreground/80 group-hover:text-primary-foreground group-hover:scale-110 transition-transform duration-200",
              isCollapsed ? "w-4 h-4 mx-auto" : "w-5 h-5 mx-auto"
            )} />
          </a>
          
          <button
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Logout error:', error);
              }
            }}
            className={cn(
              "bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-xl border border-red-500/30 transition-all duration-200 hover:shadow-lg group",
              isCollapsed ? "p-2" : "flex-1 p-3 flex items-center justify-center gap-2"
            )}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={cn(
              "text-primary-foreground/80 group-hover:text-primary-foreground group-hover:scale-110 transition-transform duration-200",
              isCollapsed ? "w-4 h-4 mx-auto" : "w-5 h-5"
            )} />
            {!isCollapsed && (
              <span className="text-sm font-semibold text-primary-foreground/80 group-hover:text-primary-foreground">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
