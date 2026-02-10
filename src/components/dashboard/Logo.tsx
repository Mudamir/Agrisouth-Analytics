import { cn } from '@/lib/utils';
import logoImage from '@/Images/AGSouth-Icon.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden">
        {/* Logo Image */}
        <img 
          src={logoImage} 
          alt="AGSouth Logo" 
          className="w-10 h-10 object-contain"
        />
      </div>
      {showText && (
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold font-heading text-primary-foreground leading-tight tracking-tight">
            AGSOUTH
          </h1>
        </div>
      )}
    </div>
  );
}

