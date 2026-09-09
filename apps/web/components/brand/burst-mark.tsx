interface BurstMarkProps {
  size?: number;
  className?: string;
  title?: string;
}
export function BurstMark({ size = 28, className, title }: BurstMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={!title}
    >
      <circle cx="16" cy="16" r="13" stroke="#582d46" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="6" stroke="#582d46" strokeWidth="2.2" />
      <path d="M16 1v9M16 22v9M1 16h9M22 16h9" stroke="#582d46" strokeWidth="2.2" />
    </svg>
  );
}
