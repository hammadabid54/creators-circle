import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names intelligently. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number compactly: 124000 -> "124K", 1500000 -> "1.5M". */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}K`;
  }
  return n.toString();
}

/** Format a number as PKR with thousands separators. */
export function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}

/** Format a number as PKR compactly: 35000 -> "PKR 35K", 1500000 -> "PKR 1.5M". */
export function formatPKRCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `PKR ${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 100_000) {
    return `PKR ${Math.round(n / 1_000)}K`;
  }
  if (n >= 1_000) {
    return `PKR ${(n / 1_000).toFixed(0)}K`;
  }
  return `PKR ${n}`;
}

/** Stable hash of a string for deterministic gradient selection. */
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Get initials from a name: "Sara Hassan" -> "SH". */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
