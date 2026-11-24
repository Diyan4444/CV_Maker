import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/goodbye'],
      disallow: [
        '/dashboard',
        '/profile',
        '/editor',
        '/settings',
        '/onboarding',
        '/api',
        '/dev',
      ],
    },
    ...(siteUrl ? { sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml` } : {}),
  };
}
