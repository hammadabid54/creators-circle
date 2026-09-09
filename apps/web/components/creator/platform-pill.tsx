import { formatNumber, cn } from '@/lib/utils';

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'facebook';

interface PlatformPillProps {
  platform: Platform;
  followers: number;
  className?: string;
  size?: 'sm' | 'md';
  handle?: string;
}

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0-1.625C8.741.538 8.332.525 7.052.563 5.775.6 4.902.81 4.14 1.318a6.42 6.42 0 0 0-2.327 2.327C1.305 4.407 1.095 5.28 1.058 6.557.525 7.836.538 8.245.538 11.504v.99c0 3.259-.013 3.668.52 5.948.037 1.277.247 2.15.755 2.912a6.42 6.42 0 0 0 2.327 2.327c.762.508 1.635.718 2.912.755 1.28.033 1.69.04 4.948.04s3.668-.007 4.948-.04c1.277-.037 2.15-.247 2.912-.755a6.42 6.42 0 0 0 2.327-2.327c.508-.762.718-1.635.755-2.912.033-1.28.04-1.69.04-4.948s-.007-3.668-.04-4.948c-.037-1.277-.247-2.15-.755-2.912a6.42 6.42 0 0 0-2.327-2.327C19.593.81 18.72.6 17.443.563 16.163.525 15.754.538 12.495.538h-.99zM12 0C8.741 0 8.333.014 7.053.072c-1.277.04-2.15.25-2.913.755A7.857 7.857 0 0 0 .928 4.14C.42 4.902.21 5.775.175 7.052.117 8.333.105 8.741.105 12s.012 3.667.07 4.947c.04 1.277.247 2.15.755 2.913a7.857 7.857 0 0 0 3.21 3.21c.762.508 1.635.718 2.912.755C8.333 23.988 8.741 24 12 24s3.667-.012 4.947-.07c1.277-.04 2.15-.247 2.913-.755a7.857 7.857 0 0 0 3.21-3.21c.508-.762.718-1.635.755-2.913.058-1.28.07-1.688.07-4.947s-.012-3.667-.07-4.947c-.04-1.277-.247-2.15-.755-2.913a7.857 7.857 0 0 0-3.21-3.21C19.147.42 18.274.21 16.997.175 15.717.117 15.309.105 12.05.105H12zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69a4.85 4.85 0 0 1-1.84 0z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const config: Record<
  Platform,
  { Icon: typeof InstagramIcon; label: string; color: string; handle?: string }
> = {
  instagram: { Icon: InstagramIcon, label: 'Instagram', color: '#E1306C' },
  youtube: { Icon: YouTubeIcon, label: 'YouTube', color: '#FF0000' },
  tiktok: { Icon: TikTokIcon, label: 'TikTok', color: '#0A0A0F' },
  facebook: { Icon: FacebookIcon, label: 'Facebook', color: '#1877F2' },
};

export function PlatformPill({
  platform,
  followers,
  className,
  size = 'md',
  handle,
}: PlatformPillProps) {
  const { Icon, label, color } = config[platform];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white border border-anjuman-line font-semibold',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className,
      )}
      title={`${label} • ${followers.toLocaleString()} followers`}
    >
      <span style={{ color }} className="flex-shrink-0 inline-flex" aria-hidden="true">
        <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      </span>
      <span className="text-anjuman-ink">{formatNumber(followers)}</span>
      {handle && <span className="text-anjuman-ink-soft font-normal">@{handle}</span>}
    </span>
  );
}
