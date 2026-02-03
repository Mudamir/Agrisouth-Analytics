import { cn } from '@/lib/utils';
import { CSSProperties, useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
  variant?: 'default' | 'large';
  style?: CSSProperties;
  isLoading?: boolean;
  delay?: number; // Stagger delay for progressive reveal
  decimalPlaces?: number; // Number of decimal places to show (default: 0)
}

export function StatCard({ label, value, className, variant = 'default', style, isLoading = false, delay = 0, decimalPlaces = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(isLoading ? '' : value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isLoading && value !== displayValue) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsAnimating(true);
        setDisplayValue(value);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 600);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isLoading, value, displayValue, delay]);

  const hasCustomBackground = style?.background || style?.backgroundColor;
  
  return (
    <div 
      className={cn(
        'stat-card transition-all duration-500 ease-out',
        !isLoading && 'animate-scale-in',
        hasCustomBackground && 'stat-card-custom-bg'
      )} 
      style={{
        animationDelay: `${delay}ms`,
        transitionDelay: `${delay}ms`,
        opacity: isLoading ? 0.7 : 1,
        ...(hasCustomBackground && { 
          '--stat-card-bg': style.background || style.backgroundColor,
          background: style.background || style.backgroundColor,
          backgroundImage: 'none'
        } as React.CSSProperties),
        ...style
      } as React.CSSProperties}
    >
      <p className="stat-card-label">{label}</p>
      {isLoading ? (
        <div className="relative overflow-hidden rounded-md">
          <div 
            className={cn(
              'h-8 bg-muted rounded',
              variant === 'large' && 'h-10'
            )}
            style={{
              width: variant === 'large' ? '180px' : '120px',
              background: 'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.4) 20%, hsl(var(--muted) / 0.6) 40%, hsl(var(--muted) / 0.4) 60%, hsl(var(--muted)) 80%, hsl(var(--muted)) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      ) : (
        <p 
          className={cn(
            'stat-card-value transition-all duration-500',
            variant === 'large' && 'text-3xl md:text-4xl',
            isAnimating && 'animate-count-up'
          )}
        >
          {typeof displayValue === 'number' 
            ? displayValue.toLocaleString('en-US', {
                minimumFractionDigits: decimalPlaces,
                maximumFractionDigits: decimalPlaces,
              })
            : displayValue}
        </p>
      )}
    </div>
  );
}
