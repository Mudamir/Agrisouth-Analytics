import { useState } from 'react';
import { FruitType } from '@/types/shipping';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Mail, 
  Banana,
  TrendingUp,
  Package,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  Settings,
  LineChart,
  Table2,
  FileCheck,
  History
} from 'lucide-react';
import { Logo } from './Logo';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { PineappleIcon } from './PineappleIcon';

interface SidebarProps {
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
  currentPage: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs' | 'generate';
  onNavigate: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs' | 'generate') => void;
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
        className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-primary/95 backdrop-blur-md border-2 border-white/30 shadow-lg flex items-center justify-center hover:bg-primary hover:scale-110 transition-all duration-300 hover:shadow-xl"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-primary-foreground" />
        )}
      </button>

      {/* Logo Section */}
      <div className={cn(
        "border-b border-primary/30 transition-all duration-300 bg-gradient-to-r from-primary/50 to-transparent",
        isCollapsed ? "p-3" : "p-4 pb-3"
      )}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden">
              <img 
                src={logoImage} 
                alt="Agrisouth Logo" 
                className="w-9 h-9 object-contain"
              />
            </div>
          </div>
        ) : (
          <Logo />
        )}
      </div>

      {/* Navigation Section */}
      <nav className={cn(
        "flex-1 py-3 space-y-2.5 overflow-y-auto sidebar-scroll transition-all duration-300",
        isCollapsed ? "px-2" : "px-2.5"
      )}>
        {/* Products Section */}
        <div className="mb-3">
          {!isCollapsed && (
            <p className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-[0.2em] px-2.5 mb-2">
              Products
            </p>
          )}
          
          <div className="space-y-1">
            <button
              onClick={() => {
                onSelectFruit('BANANAS');
                onNavigate('dashboard');
              }}
              className={cn(
                'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                selectedFruit === 'BANANAS' && currentPage === 'dashboard'
                  ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                  : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
              )}
              title={isCollapsed ? "Bananas" : undefined}
            >
              <div className={cn(
                'flex items-center justify-center rounded-md transition-all duration-300',
                selectedFruit === 'BANANAS' && currentPage === 'dashboard'
                  ? 'bg-accent-foreground/10 p-1'
                  : 'bg-white/5 p-1 group-hover:bg-white/10'
              )}>
                <Banana className={cn(
                  'transition-all duration-300 flex-shrink-0',
                  isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                  selectedFruit === 'BANANAS' && currentPage === 'dashboard' 
                    ? 'scale-110 text-accent-foreground' 
                    : 'group-hover:scale-105 text-primary-foreground/90'
                )} />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-xs tracking-wide">Bananas</span>
              )}
            </button>
            
            <button
              onClick={() => {
                onSelectFruit('PINEAPPLES');
                onNavigate('dashboard');
              }}
              className={cn(
                'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard'
                  ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                  : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
              )}
              title={isCollapsed ? "Pineapples" : undefined}
            >
              <div className={cn(
                'flex items-center justify-center rounded-md transition-all duration-300',
                selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard'
                  ? 'bg-accent-foreground/10 p-1'
                  : 'bg-white/5 p-1 group-hover:bg-white/10'
              )}>
                <PineappleIcon className={cn(
                  'transition-all duration-300 flex-shrink-0',
                  isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                  selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard' 
                    ? 'scale-110 text-accent-foreground' 
                    : 'group-hover:scale-105 text-primary-foreground/90'
                )} />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-xs tracking-wide">Pineapples</span>
              )}
            </button>
          </div>
        </div>

        {/* Views Section */}
        <div className="pt-2.5 border-t border-primary/30">
          {!isCollapsed && (
            <p className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-[0.2em] px-2.5 mb-2">
              Views
            </p>
          )}
          
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('analysis')}
              className={cn(
                'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                currentPage === 'analysis'
                  ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                  : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
              )}
              title={isCollapsed ? "Analysis" : undefined}
            >
              <div className={cn(
                'flex items-center justify-center rounded-md transition-all duration-300',
                currentPage === 'analysis'
                  ? 'bg-accent-foreground/10 p-1'
                  : 'bg-white/5 p-1 group-hover:bg-white/10'
              )}>
                <LineChart className={cn(
                  'transition-all duration-300 flex-shrink-0',
                  isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                  currentPage === 'analysis' 
                    ? 'scale-110 text-accent-foreground' 
                    : 'group-hover:scale-105 text-primary-foreground/90'
                )} />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-xs tracking-wide">Analysis</span>
              )}
            </button>
            
            {canAccessPage('data') && (
              <button
                onClick={() => onNavigate('data')}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                  isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                  currentPage === 'data'
                    ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                    : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
                )}
                title={isCollapsed ? "Data" : undefined}
              >
                <div className={cn(
                  'flex items-center justify-center rounded-md transition-all duration-300',
                  currentPage === 'data'
                    ? 'bg-accent-foreground/10 p-1'
                    : 'bg-white/5 p-1 group-hover:bg-white/10'
                )}>
                  <Table2 className={cn(
                    'transition-all duration-300 flex-shrink-0',
                    isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                    currentPage === 'data' 
                      ? 'scale-110 text-accent-foreground' 
                      : 'group-hover:scale-105 text-primary-foreground/90'
                  )} />
                </div>
                {!isCollapsed && (
                  <span className="font-semibold text-xs tracking-wide">Data</span>
                )}
              </button>
            )}
            
            {canAccessPNL && (
              <button
                onClick={() => onNavigate('pnl')}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                  isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                  currentPage === 'pnl'
                    ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                    : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
                )}
                title={isCollapsed ? "PNL" : undefined}
              >
                <div className={cn(
                  'flex items-center justify-center rounded-md transition-all duration-300',
                  currentPage === 'pnl'
                    ? 'bg-accent-foreground/10 p-1'
                    : 'bg-white/5 p-1 group-hover:bg-white/10'
                )}>
                  <TrendingUp className={cn(
                    'transition-all duration-300 flex-shrink-0',
                    isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                    currentPage === 'pnl' 
                      ? 'scale-110 text-accent-foreground' 
                      : 'group-hover:scale-105 text-primary-foreground/90'
                  )} />
                </div>
                {!isCollapsed && (
                  <span className="font-semibold text-xs tracking-wide">PNL</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Generate Section - Separated */}
        {canAccessPage('data') && (
          <div className="pt-2.5 border-t border-primary/30">
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-[0.2em] px-2.5 mb-2">
                Generate
              </p>
            )}
            <button
              onClick={() => onNavigate('generate')}
              className={cn(
                'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                currentPage === 'generate'
                  ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                  : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
              )}
              title={isCollapsed ? "Generate" : undefined}
            >
              <div className={cn(
                'flex items-center justify-center rounded-md transition-all duration-300',
                currentPage === 'generate'
                  ? 'bg-accent-foreground/10 p-1'
                  : 'bg-white/5 p-1 group-hover:bg-white/10'
              )}>
                <FileCheck className={cn(
                  'transition-all duration-300 flex-shrink-0',
                  isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                  currentPage === 'generate' 
                    ? 'scale-110 text-accent-foreground' 
                    : 'group-hover:scale-105 text-primary-foreground/90'
                )} />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-xs tracking-wide">Generate</span>
              )}
            </button>
          </div>
        )}

        {/* Settings Section */}
        {(canAccessUserManagement || canAccessConfiguration || canAccessDataLogs) && (
          <div className="pt-2.5 border-t border-primary/30">
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-primary-foreground/40 uppercase tracking-[0.2em] px-2.5 mb-2">
                Settings
              </p>
            )}
            
            <div className="space-y-1">
              {canAccessUserManagement && (
                <button
                  onClick={() => onNavigate('users')}
                  className={cn(
                    'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                    isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                    currentPage === 'users'
                      ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                      : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
                  )}
                  title={isCollapsed ? "User Management" : undefined}
                >
                  <div className={cn(
                    'flex items-center justify-center rounded-md transition-all duration-300',
                    currentPage === 'users'
                      ? 'bg-accent-foreground/10 p-1'
                      : 'bg-white/5 p-1 group-hover:bg-white/10'
                  )}>
                    <Users className={cn(
                      'transition-all duration-300 flex-shrink-0',
                      isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                      currentPage === 'users' 
                        ? 'scale-110 text-accent-foreground' 
                        : 'group-hover:scale-105 text-primary-foreground/90'
                    )} />
                  </div>
                  {!isCollapsed && (
                    <span className="font-semibold text-xs tracking-wide">User Management</span>
                  )}
                </button>
              )}

              {canAccessDataLogs && (
                <button
                  onClick={() => onNavigate('data-logs')}
                  className={cn(
                    'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                    isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                    currentPage === 'data-logs'
                      ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                      : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
                  )}
                  title={isCollapsed ? "Data Logs" : undefined}
                >
                  <div className={cn(
                    'flex items-center justify-center rounded-md transition-all duration-300',
                    currentPage === 'data-logs'
                      ? 'bg-accent-foreground/10 p-1'
                      : 'bg-white/5 p-1 group-hover:bg-white/10'
                  )}>
                    <History className={cn(
                      'transition-all duration-300 flex-shrink-0',
                      isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                      currentPage === 'data-logs' 
                        ? 'scale-110 text-accent-foreground' 
                        : 'group-hover:scale-105 text-primary-foreground/90'
                    )} />
                  </div>
                  {!isCollapsed && (
                    <span className="font-semibold text-xs tracking-wide">Data Logs</span>
                  )}
                </button>
              )}
              
              {canAccessConfiguration && (
                <button
                  onClick={() => onNavigate('configuration')}
                  className={cn(
                    'w-full flex items-center rounded-lg transition-all duration-300 group relative overflow-hidden',
                    isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
                    currentPage === 'configuration'
                      ? 'bg-accent/90 text-accent-foreground shadow-md shadow-accent/30 border border-accent/20'
                      : 'text-primary-foreground/75 hover:bg-white/10 hover:text-primary-foreground border border-transparent hover:border-white/10'
                  )}
                  title={isCollapsed ? "Configuration" : undefined}
                >
                  <div className={cn(
                    'flex items-center justify-center rounded-md transition-all duration-300',
                    currentPage === 'configuration'
                      ? 'bg-accent-foreground/10 p-1'
                      : 'bg-white/5 p-1 group-hover:bg-white/10'
                  )}>
                    <Settings className={cn(
                      'transition-all duration-300 flex-shrink-0',
                      isCollapsed ? 'w-4 h-4' : 'w-4 h-4',
                      currentPage === 'configuration' 
                        ? 'scale-110 text-accent-foreground' 
                        : 'group-hover:scale-105 text-primary-foreground/90'
                    )} />
                  </div>
                  {!isCollapsed && (
                    <span className="font-semibold text-xs tracking-wide">Configuration</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Summary Section */}
      <div className={cn(
        "border-t border-primary/30 bg-gradient-to-t from-primary/40 to-transparent backdrop-blur-md transition-all duration-300",
        isCollapsed ? "p-2" : "p-3 space-y-2"
      )}>
        {!isCollapsed && (
          <>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/15">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-md bg-white/10">
                  <Package className="w-3.5 h-3.5 text-accent" />
                </div>
                <p className="text-[9px] font-bold text-primary-foreground/60 uppercase tracking-[0.15em]">
                  Containers
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-accent tracking-tight">
                {totalContainers.toLocaleString()}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/15">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-md bg-white/10">
                  <BarChart3 className="w-3.5 h-3.5 text-accent" />
                </div>
                <p className="text-[9px] font-bold text-primary-foreground/60 uppercase tracking-[0.15em]">
                  Cartons
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-accent tracking-tight">
                {totalCartons.toLocaleString()}
              </p>
              <p className="text-[9px] text-primary-foreground/50 mt-1.5 italic">
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
              "bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:scale-105 group block",
              isCollapsed ? "p-2" : "flex-1 p-2.5"
            )}
            title={isCollapsed ? "Email" : undefined}
          >
            <Mail className={cn(
              "text-primary-foreground/80 group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300",
              isCollapsed ? "w-4 h-4 mx-auto" : "w-4 h-4 mx-auto"
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
              "bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md rounded-lg border border-red-500/30 transition-all duration-300 hover:shadow-lg hover:scale-105 group",
              isCollapsed ? "p-2" : "flex-1 p-2.5 flex items-center justify-center gap-1.5"
            )}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={cn(
              "text-primary-foreground/80 group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300",
              isCollapsed ? "w-4 h-4 mx-auto" : "w-4 h-4"
            )} />
            {!isCollapsed && (
              <span className="text-xs font-semibold text-primary-foreground/80 group-hover:text-primary-foreground tracking-wide">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
