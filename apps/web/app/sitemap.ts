import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { searchPsychologists } from '@/services/psychologists';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${env.siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${env.siteUrl}/psicologos`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    }
  ];

  try {
    const results = await searchPsychologists({
      perPage: '50'
    });

    results.data.forEach((profile) => {
      routes.push({
        url: `${env.siteUrl}/psicologos/${profile.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8
      });
    });
  } catch {
    return routes;
  }

  return routes;
}
