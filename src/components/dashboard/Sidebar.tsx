import { useState, type ElementType } from 'react';
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
  History
} from 'lucide-react';
import { Logo } from './Logo';
import logoImage from '@/Images/AGSouth-Icon.png';
import { useAuth } from '@/contexts/AuthContext';
import { PineappleIcon } from './PineappleIcon';

interface SidebarProps {
  selectedFruit: FruitType;
  onSelectFruit: (fruit: FruitType) => void;
  currentPage: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs';
  onNavigate: (page: 'dashboard' | 'analysis' | 'data' | 'pnl' | 'users' | 'configuration' | 'data-logs') => void;
  totalContainers: number;
  totalCartons: number;
}

function NavItem({
  active,
  collapsed,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'relative w-full flex items-center rounded-lg transition-colors duration-200',
        collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-2',
        active
          ? 'bg-white/12 text-white'
          : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-sky-300" />
      )}
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-sky-200' : 'text-white/80')} />
      {!collapsed && (
        <span className="font-medium text-[13px] tracking-wide">{label}</span>
      )}
    </button>
  );
}

export function Sidebar({ 
  selectedFruit, 
  onSelectFruit, 
  currentPage, 
  onNavigate,
  totalContainers,
  totalCartons,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('agsouth-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const { logout, canAccessPage, canAccessUserManagement, canAccessPNL, canAccessConfiguration } = useAuth();
  const canAccessDataLogs = canAccessPage('data-logs');

  return (
    <aside className={cn(
      "bg-[#123A63] flex flex-col h-screen shrink-0 border-r border-white/5 transition-all duration-300 relative",
      isCollapsed ? "w-16" : "w-56"
    )}>
      <button
        onClick={() => {
          setIsCollapsed((current) => {
            const next = !current;
            try {
              localStorage.setItem('agsouth-sidebar-collapsed', String(next));
            } catch {
              // ignore storage errors
            }
            return next;
          });
        }}
        className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-[#0E2F52] border border-white/20 shadow-md flex items-center justify-center hover:bg-[#1B4F8A] transition-colors"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-white" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-white" />
        )}
      </button>

      <div className={cn(
        "border-b border-white/10 transition-all duration-300",
        isCollapsed ? "p-3" : "p-4 pb-3"
      )}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-white overflow-hidden">
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

      <nav className={cn(
        "flex-1 py-3 space-y-4 overflow-y-auto sidebar-scroll transition-all duration-300",
        isCollapsed ? "px-2" : "px-2.5"
      )}>
        <div>
          {!isCollapsed && (
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.18em] px-2.5 mb-1.5">
              Products
            </p>
          )}
          <div className="space-y-0.5">
            <NavItem
              active={selectedFruit === 'BANANAS' && currentPage === 'dashboard'}
              collapsed={isCollapsed}
              icon={Banana}
              label="Bananas"
              onClick={() => {
                onSelectFruit('BANANAS');
                onNavigate('dashboard');
              }}
            />
            <NavItem
              active={selectedFruit === 'PINEAPPLES' && currentPage === 'dashboard'}
              collapsed={isCollapsed}
              icon={PineappleIcon}
              label="Pineapples"
              onClick={() => {
                onSelectFruit('PINEAPPLES');
                onNavigate('dashboard');
              }}
            />
          </div>
        </div>

        <div className="pt-1 border-t border-white/10">
          {!isCollapsed && (
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.18em] px-2.5 mb-1.5 mt-3">
              Views
            </p>
          )}
          <div className="space-y-0.5">
            <NavItem
              active={currentPage === 'analysis'}
              collapsed={isCollapsed}
              icon={LineChart}
              label="Analysis"
              onClick={() => onNavigate('analysis')}
            />
            {canAccessPage('data') && (
              <NavItem
                active={currentPage === 'data'}
                collapsed={isCollapsed}
                icon={Table2}
                label="Data"
                onClick={() => onNavigate('data')}
              />
            )}
            {canAccessPNL && (
              <NavItem
                active={currentPage === 'pnl'}
                collapsed={isCollapsed}
                icon={TrendingUp}
                label="PNL"
                onClick={() => onNavigate('pnl')}
              />
            )}
          </div>
        </div>

        {(canAccessUserManagement || canAccessConfiguration || canAccessDataLogs) && (
          <div className="pt-1 border-t border-white/10">
            {!isCollapsed && (
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.18em] px-2.5 mb-1.5 mt-3">
                Settings
              </p>
            )}
            <div className="space-y-0.5">
              {canAccessUserManagement && (
                <NavItem
                  active={currentPage === 'users'}
                  collapsed={isCollapsed}
                  icon={Users}
                  label="User Management"
                  onClick={() => onNavigate('users')}
                />
              )}
              {canAccessDataLogs && (
                <NavItem
                  active={currentPage === 'data-logs'}
                  collapsed={isCollapsed}
                  icon={History}
                  label="Data Logs"
                  onClick={() => onNavigate('data-logs')}
                />
              )}
              {canAccessConfiguration && (
                <NavItem
                  active={currentPage === 'configuration'}
                  collapsed={isCollapsed}
                  icon={Settings}
                  label="Configuration"
                  onClick={() => onNavigate('configuration')}
                />
              )}
            </div>
          </div>
        )}
      </nav>

      <div className={cn(
        "border-t border-white/10 transition-all duration-300",
        isCollapsed ? "p-2" : "p-3 space-y-2"
      )}>
        {!isCollapsed && (
          <>
            <div className="rounded-xl bg-white/[0.08] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="w-3.5 h-3.5 text-sky-300" />
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.14em]">
                  Containers
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-white tracking-tight">
                {totalContainers.toLocaleString()}
              </p>
            </div>
            
            <div className="rounded-xl bg-white/[0.08] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-sky-300" />
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.14em]">
                  Cartons
                </p>
              </div>
              <p className="text-2xl font-bold font-heading text-white tracking-tight">
                {totalCartons.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/40 mt-1">
                Based on current filters
              </p>
            </div>
          </>
        )}

        <div className={cn("flex gap-2", isCollapsed ? "flex-col" : "flex-row")}>
          <a 
            href="https://outlook.office.com/mail/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "rounded-lg bg-white/[0.08] hover:bg-white/15 transition-colors block",
              isCollapsed ? "p-2" : "flex-1 p-2.5"
            )}
            title={isCollapsed ? "Email" : undefined}
          >
            <Mail className="w-4 h-4 mx-auto text-white/80" />
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
              "rounded-lg bg-red-500/15 hover:bg-red-500/25 transition-colors",
              isCollapsed ? "p-2" : "flex-1 p-2.5 flex items-center justify-center gap-1.5"
            )}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={cn("w-4 h-4 text-white/80", isCollapsed && "mx-auto")} />
            {!isCollapsed && (
              <span className="text-xs font-semibold text-white/80">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
