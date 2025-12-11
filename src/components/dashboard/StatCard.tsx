import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
  variant?: 'default' | 'large';
  style?: CSSProperties;
}

export function StatCard({ label, value, className, variant = 'default', style }: StatCardProps) {
  return (
    <div className={cn('stat-card animate-scale-in', className)} style={style}>
      <p className="stat-card-label">{label}</p>
      <p className={cn(
        'stat-card-value',
        variant === 'large' && 'text-3xl md:text-4xl'
      )}>
        {typeof value === 'number' 
          ? value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : value}
      </p>
    </div>
  );
}
