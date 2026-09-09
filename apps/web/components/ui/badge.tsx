import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'verified' | 'pro' | 'soft' | 'success';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-anjuman-line-soft text-anjuman-ink',
  verified: 'bg-[#f0e9ef] text-anjuman-purple',
  pro: 'bg-anjuman-purple text-white',
  soft: 'bg-anjuman-line-soft text-anjuman-ink-soft',
  success: 'bg-emerald-50 text-emerald-700',
};

export function Badge({ children, variant = 'default', className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full',
        variantClasses[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
