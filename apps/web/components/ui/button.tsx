import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'gradient' | 'outline' | 'white';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-anjuman-purple text-white hover:bg-[#402036]',
  ghost: 'bg-transparent text-anjuman-ink hover:bg-anjuman-line-soft',
  gradient: 'bg-anjuman-purple text-white hover:bg-[#402036]',
  outline: 'bg-transparent text-anjuman-ink border border-anjuman-line hover:bg-anjuman-line-soft',
  white: 'bg-white text-anjuman-ink hover:bg-anjuman-yellow',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anjuman-purple focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
