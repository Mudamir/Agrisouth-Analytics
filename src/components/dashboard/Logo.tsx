import { cn } from '@/lib/utils';
import logoImage from '@/Images/AGSouth-Icon.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center">
        <img 
          src={logoImage} 
          alt="AGSouth Logo" 
          className="w-full h-full object-contain p-0.5"
        />
      </div>
      {showText && (
        <div className="flex-1 min-w-0 leading-tight">
          <h1 className="text-sm font-bold font-heading text-white tracking-tight">
            AGSOUTH
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200/80">
            Analytics
          </p>
        </div>
      )}
    </div>
  );
}
