import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return site
    ? {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/admin',
            '/account',
            '/brand/',
            '/creator/',
            '/api/',
            '/messages',
            '/onboarding',
            '/signin',
          ],
        },
        sitemap: site + '/sitemap.xml',
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
