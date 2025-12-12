import { cn } from '@/lib/utils';
import logoImage from '@/Images/AGSouth-Icon.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
        {/* Logo Image */}
        <img 
          src={logoImage} 
          alt="AGSouth Logo" 
          className="w-12 h-12 object-contain"
        />
      </div>
      {showText && (
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold font-heading text-primary-foreground leading-tight">
            AGSouth
          </h1>
          <p className="text-xs text-primary-foreground/70 font-medium">
            Dashboard
          </p>
        </div>
      )}
    </div>
  );
}

