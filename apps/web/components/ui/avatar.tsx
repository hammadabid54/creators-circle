'use client';
import Image from 'next/image';
import { useState } from 'react';
import { cn, getInitials } from '@/lib/utils';
interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  gradient?: string;
  className?: string;
  src?: string;
  alt?: string;
}
const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-24 h-24 text-2xl',
};
export function Avatar({ name, size = 'md', className, src, alt }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <Image
      unoptimized
      src={src}
      onError={() => setFailed(true)}
      alt={alt || name}
      width={96}
      height={96}
      className={cn('rounded-full object-cover shrink-0', sizes[size], className)}
    />
  ) : (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-[#65475b] bg-[#eee5eb] shrink-0',
        sizes[size],
        className,
      )}
    >
      {getInitials(name) || '?'}
    </span>
  );
}
