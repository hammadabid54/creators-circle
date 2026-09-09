/**
 * Static reference data for onboarding forms.
 * Mirrors `lib/mock-data.ts` niches but as a separate small import so the
 * onboarding pages stay lean.
 */

export const NICHE_OPTIONS = [
  'Lifestyle',
  'Fashion',
  'Health & Wellness',
  'Fitness',
  'Food & Cooking',
  'Travel',
  'Beauty & Makeup',
  'Tech & Gadgets',
  'Parenting',
  'Education',
  'Personal Finance',
  'Comedy',
] as const;

export const LANGUAGE_OPTIONS = [
  { code: 'EN', label: 'English' },
  { code: 'UR', label: 'Urdu' },
  { code: 'PN', label: 'Punjabi' },
  { code: 'SD', label: 'Sindhi' },
  { code: 'PS', label: 'Pashto' },
  { code: 'BL', label: 'Balochi' },
  { code: 'SK', label: 'Saraiki' },
] as const;

export const CITY_OPTIONS = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Faisalabad',
  'Hyderabad',
  'Gujranwala',
  'Bahawalpur',
  'Other',
] as const;

export const INDUSTRY_OPTIONS = [
  'Fashion & Apparel',
  'Beauty & Personal Care',
  'Food & Beverage',
  'Technology',
  'Telecommunications',
  'Banking & Finance',
  'E-commerce / D2C',
  'Education',
  'Real Estate',
  'Travel & Hospitality',
  'Automotive',
  'Entertainment & Media',
  'Other',
] as const;

export const BUDGET_TIERS = [
  { value: 'PKR_50K_100K', label: 'PKR 50K – 100K / month' },
  { value: 'PKR_100K_500K', label: 'PKR 100K – 500K / month' },
  { value: 'PKR_500K_PLUS', label: 'PKR 500K+ / month' },
] as const;

export const PLATFORM_OPTIONS = [
  {
    id: 'instagram' as const,
    label: 'Instagram',
    placeholder: 'yourusername',
    oauthPath: '/api/social/meta/start',
  },
  {
    id: 'youtube' as const,
    label: 'YouTube',
    placeholder: 'YourChannel',
    oauthPath: '/api/social/youtube/start',
  },
  {
    id: 'tiktok' as const,
    label: 'TikTok',
    placeholder: 'yourusername',
    oauthPath: '/api/social/tiktok/start',
  },
  {
    id: 'facebook' as const,
    label: 'Facebook',
    placeholder: 'yourpage',
    oauthPath: '/api/social/meta/start',
  },
] as const;
