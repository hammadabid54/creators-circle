import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowUpRight, BadgeCheck, ImageIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { formatPKRCompact, formatNumber, cn } from '@/lib/utils';
export interface CreatorCardData {
  id: string;
  slug?: string | null;
  name: string;
  handle: string;
  city: string;
  niches: string[];
  bio?: string;
  image?: string;
  cover?: string;
  coverCaption?: string;
  platforms: Array<{
    platform: 'instagram' | 'youtube' | 'tiktok' | 'facebook';
    followers: number;
  }>;
  engagementRate: number | null;
  pastCollabs: number;
  languages: string[];
  startingRate: number | null;
  rateUnit: string;
  verified: boolean;
  available?: boolean;
  demo?: boolean;
  createdAt?: string;
  provenance?: string;
  lastSyncedAt?: string | null;
  rankingReasons?: string[];
}
export function CreatorCard({
  creator,
  className,
  actions,
}: {
  creator: CreatorCardData;
  className?: string;
  actions?: React.ReactNode;
}) {
  const primary = [...creator.platforms].sort((a, b) => b.followers - a.followers)[0];
  return (
    <article
      className={cn('cc-panel overflow-hidden group flex flex-col anj-card-lift', className)}
    >
      <Link href={'/creators/' + (creator.slug || creator.id)} className="block">
        {creator.cover ? (
          <div className="aspect-[1.7] bg-anjuman-line-soft overflow-hidden">
            <Image
              unoptimized
              src={creator.cover}
              alt={creator.coverCaption || 'Work shared by ' + creator.name}
              width={600}
              height={350}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="h-24 bg-[#eee7e9] px-5 py-4 flex items-center justify-between">
            <span className="text-xs font-medium text-[#745d6b]">
              {creator.niches[0] || 'Independent creator'}
            </span>
            <ImageIcon size={22} strokeWidth={1.2} className="text-[#9b8593]" aria-hidden />
          </div>
        )}
        <div className="p-5 pb-3">
          <div className="flex gap-3 items-center">
            <Avatar name={creator.name} src={creator.image} size="md" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate flex gap-1.5 items-center">
                {creator.name}
                {creator.verified && (
                  <span title="Profile marked as verified" aria-label="Profile marked as verified">
                    <BadgeCheck size={17} className="text-anjuman-purple" />
                  </span>
                )}
              </h3>
              <p className="cc-subtle flex items-center gap-1">
                <MapPin size={12} />
                {creator.city}
              </p>
            </div>
          </div>
          <p className="text-sm text-anjuman-ink-soft leading-relaxed line-clamp-2 mt-4 min-h-10">
            {creator.bio ||
              creator.niches.join(' · ') ||
              'Explore this creator’s profile and services.'}
          </p>
          <div className="flex gap-2 items-center mt-4 text-xs">
            <span className="bg-anjuman-line-soft rounded px-2 py-1 capitalize">
              {primary?.platform || 'Creator'}
            </span>
            {primary && (
              <span className="text-anjuman-ink-soft">
                {formatNumber(primary.followers)} followers
              </span>
            )}
            {creator.demo && <span className="text-[#87621b] ml-auto">Demo</span>}
          </div>
        </div>
      </Link>
      <div className="flex justify-between items-center gap-3 border-t border-anjuman-line mx-5 py-4 mt-auto">
        <div>
          <span className="text-xs text-anjuman-ink-soft">
            {creator.startingRate === null ? 'Pricing' : 'Starting at'}
          </span>
          <p className="text-sm font-semibold mt-0.5">
            {creator.startingRate === null
              ? 'Ask for a quote'
              : formatPKRCompact(creator.startingRate)}
            {creator.startingRate !== null && (
              <span className="font-normal text-anjuman-ink-soft"> / {creator.rateUnit}</span>
            )}
          </p>
        </div>
        <Link
          aria-label={'View ' + creator.name + ' profile'}
          href={'/creators/' + (creator.slug || creator.id)}
          className="w-10 h-10 rounded-full border border-anjuman-line flex items-center justify-center text-anjuman-purple hover:bg-anjuman-line-soft"
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
      {creator.rankingReasons && (
        <details className="border-t border-anjuman-line px-5 py-3 text-xs">
          <summary className="cursor-pointer font-medium text-anjuman-purple">
            Why this result?
          </summary>
          <ul className="mt-2 space-y-1 text-anjuman-ink-soft">
            {creator.rankingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      )}
      {actions && <div className="border-t border-anjuman-line px-5 py-3">{actions}</div>}
    </article>
  );
}
