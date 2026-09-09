import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  Shirt,
  HeartPulse,
  Dumbbell,
  UtensilsCrossed,
  Plane,
  Heart,
  Smartphone,
  Baby,
  GraduationCap,
  TrendingUp,
  Smile,
} from 'lucide-react';

export interface Niche {
  id: string;
  name: string;
  count: number;
  icon: LucideIcon;
  /** Gradient used for the icon tile (small element). One per niche — disciplined. */
  iconGradient: string;
  /** Tiers 1-3 used for "Trending" mark + niche count badge. */
  tier?: 'top' | 'mid';
}

export const niches: Niche[] = [
  { id: 'lifestyle', name: 'Lifestyle', count: 312, icon: Sparkles, iconGradient: 'linear-gradient(135deg, #FF006E 0%, #8338EC 100%)', tier: 'top' },
  { id: 'fashion', name: 'Fashion', count: 287, icon: Shirt, iconGradient: 'linear-gradient(135deg, #FF006E 0%, #FB7185 100%)', tier: 'top' },
  { id: 'health', name: 'Health & Wellness', count: 198, icon: HeartPulse, iconGradient: 'linear-gradient(135deg, #00D9FF 0%, #06B6D4 100%)', tier: 'top' },
  { id: 'fitness', name: 'Fitness', count: 156, icon: Dumbbell, iconGradient: 'linear-gradient(135deg, #FFD60A 0%, #F59E0B 100%)', tier: 'mid' },
  { id: 'food', name: 'Food & Cooking', count: 221, icon: UtensilsCrossed, iconGradient: 'linear-gradient(135deg, #FF006E 0%, #FFD60A 100%)', tier: 'mid' },
  { id: 'travel', name: 'Travel', count: 143, icon: Plane, iconGradient: 'linear-gradient(135deg, #8338EC 0%, #00D9FF 100%)', tier: 'mid' },
  { id: 'beauty', name: 'Beauty & Makeup', count: 264, icon: Heart, iconGradient: 'linear-gradient(135deg, #EC4899 0%, #FF006E 100%)', tier: 'top' },
  { id: 'tech', name: 'Tech & Gadgets', count: 118, icon: Smartphone, iconGradient: 'linear-gradient(135deg, #0EA5E9 0%, #00D9FF 100%)', tier: 'mid' },
  { id: 'parenting', name: 'Parenting', count: 89, icon: Baby, iconGradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)' },
  { id: 'education', name: 'Education', count: 142, icon: GraduationCap, iconGradient: 'linear-gradient(135deg, #8B5CF6 0%, #8338EC 100%)' },
  { id: 'finance', name: 'Personal Finance', count: 97, icon: TrendingUp, iconGradient: 'linear-gradient(135deg, #10B981 0%, #25D366 100%)' },
  { id: 'comedy', name: 'Comedy', count: 178, icon: Smile, iconGradient: 'linear-gradient(135deg, #FB7185 0%, #FFD60A 100%)' },
];

export const trustItems = [
  'Verified creators',
  'Escrow on every deal',
  'Get paid in 48 hours',
  '10% commission (lowest in PK)',
  'Pay in PKR',
];

export const brandSteps = [
  {
    n: 1,
    title: 'Search creators',
    body: 'Filter by niche, followers, engagement, city, rate, and language.',
  },
  {
    n: 2,
    title: 'Reach out & negotiate',
    body: 'Message creators in-app, agree on deliverables and rate, lock in a contract.',
  },
  {
    n: 3,
    title: 'Pay in escrow, get content',
    body: 'Funds held safely until you approve content. Pay in PKR, creator paid in 48h.',
  },
];

export const creatorSteps = [
  {
    n: 1,
    title: 'Build your profile',
    body: 'Link your Instagram, YouTube, TikTok, and Facebook. Pick niches, set your rate card.',
  },
  {
    n: 2,
    title: 'Get discovered',
    body: 'Brands search by niche and reach out. You can also browse open campaigns and apply.',
  },
  {
    n: 3,
    title: 'Get paid in PKR',
    body: 'Funds in escrow, paid to your JazzCash, EasyPaisa, or bank within 48h of approval.',
  },
];

export const heroStats = [
  { value: '2,400+', label: 'Creators' },
  { value: '800+', label: 'Brands' },
  { value: 'PKR 12M+', label: 'Paid out' },
  { value: '10%', label: 'Commission' },
];

export const floatingCards = [
  {
    name: 'Sara Hassan',
    handle: 'sarahassan',
    city: 'Karachi',
    initials: 'SH',
    gradient: 'linear-gradient(135deg, #FF006E 0%, #8338EC 100%)',
    bio: 'Lifestyle + fashion',
    stats: [
      { num: '248K', lbl: 'Followers' },
      { num: '5.2%', lbl: 'Engage' },
      { num: '42', lbl: 'Collabs' },
    ],
  },
  {
    name: 'Usman Ali',
    handle: 'usmanali',
    city: 'Lahore',
    initials: 'UA',
    gradient: 'linear-gradient(135deg, #00D9FF 0%, #0EA5E9 100%)',
    bio: 'Tech + education',
    stats: [
      { num: '1.2M', lbl: 'Subs' },
      { num: '4.8%', lbl: 'Engage' },
      { num: '28', lbl: 'Collabs' },
    ],
  },
  {
    name: 'Maha Khan',
    handle: 'mahakhan',
    city: 'Islamabad',
    initials: 'MK',
    gradient: 'linear-gradient(135deg, #FFD60A 0%, #FF006E 100%)',
    bio: 'Beauty + lifestyle',
    stats: [
      { num: '186K', lbl: 'Followers' },
      { num: '6.1%', lbl: 'Engage' },
      { num: '19', lbl: 'Collabs' },
    ],
  },
];

export const featuredCreators = [
  {
    id: '1',
    name: 'Sara Hassan',
    handle: 'sarahassan',
    city: 'Karachi',
    niches: ['Lifestyle', 'Fashion'],
    platforms: [
      { platform: 'instagram' as const, followers: 248_000 },
      { platform: 'youtube' as const, followers: 0 },
    ],
    engagementRate: 5.2,
    pastCollabs: 42,
    languages: ['EN', 'UR'],
    startingRate: 35_000,
    rateUnit: 'post',
    verified: true,
  },
  {
    id: '2',
    name: 'Usman Ali',
    handle: 'usmanali',
    city: 'Lahore',
    niches: ['Tech', 'Education'],
    platforms: [
      { platform: 'instagram' as const, followers: 184_000 },
      { platform: 'youtube' as const, followers: 1_200_000 },
    ],
    engagementRate: 4.8,
    pastCollabs: 28,
    languages: ['EN', 'UR'],
    startingRate: 120_000,
    rateUnit: 'video',
    verified: true,
  },
  {
    id: '3',
    name: 'Maha Khan',
    handle: 'mahakhan',
    city: 'Islamabad',
    niches: ['Beauty', 'Lifestyle'],
    platforms: [
      { platform: 'instagram' as const, followers: 186_000 },
      { platform: 'tiktok' as const, followers: 52_000 },
    ],
    engagementRate: 6.1,
    pastCollabs: 19,
    languages: ['EN', 'UR'],
    startingRate: 25_000,
    rateUnit: 'post',
    verified: true,
  },
  {
    id: '4',
    name: 'Ali Shah',
    handle: 'alishahfit',
    city: 'Karachi',
    niches: ['Fitness', 'Health'],
    platforms: [
      { platform: 'instagram' as const, followers: 412_000 },
      { platform: 'youtube' as const, followers: 88_000 },
    ],
    engagementRate: 4.3,
    pastCollabs: 31,
    languages: ['EN', 'UR'],
    startingRate: 50_000,
    rateUnit: 'reel',
    verified: true,
  },
  {
    id: '5',
    name: 'Fatima Riaz',
    handle: 'fatimariaz',
    city: 'Lahore',
    niches: ['Food', 'Travel'],
    platforms: [
      { platform: 'instagram' as const, followers: 95_000 },
      { platform: 'youtube' as const, followers: 0 },
    ],
    engagementRate: 7.2,
    pastCollabs: 12,
    languages: ['EN', 'UR', 'PN'],
    startingRate: 18_000,
    rateUnit: 'post',
    verified: true,
  },
  {
    id: '6',
    name: 'Hira Ahmed',
    handle: 'hiraahmed',
    city: 'Islamabad',
    niches: ['Parenting', 'Lifestyle'],
    platforms: [
      { platform: 'instagram' as const, followers: 312_000 },
      { platform: 'youtube' as const, followers: 42_000 },
    ],
    engagementRate: 5.8,
    pastCollabs: 23,
    languages: ['EN', 'UR'],
    startingRate: 40_000,
    rateUnit: 'post',
    verified: true,
  },
];
