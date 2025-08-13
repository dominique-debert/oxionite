import { getCachedSiteMap } from './context/site-cache';

export async function getSocialImageUrl(pageId: string): Promise<string | null> {
  const siteMap = await getCachedSiteMap();
  const page = Object.values(siteMap.pageInfoMap).find(p => p.pageId === pageId);

  if (page && page.slug) {
    return `/social-images/${page.slug}.png`;
  }

  return null;
}
