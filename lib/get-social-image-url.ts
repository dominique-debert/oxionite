import { getCachedSiteMap } from './context/site-cache';
import type { SiteMap, PageInfo } from './context/types';

export async function getSocialImageUrl(
  pageId: string,
  siteMap?: SiteMap
): Promise<string | null> {
  try {
    console.log('[getSocialImageUrl] Starting with pageId:', pageId)
    const currentSiteMap = siteMap || await getCachedSiteMap();
    
    // Normalize pageId by removing dashes for comparison
    const normalizedPageId = pageId.replace(/-/g, '');
    
    const page = Object.values(currentSiteMap.pageInfoMap).find((p: PageInfo) => {
      const normalizedMapPageId = p.pageId.replace(/-/g, '');
      return normalizedMapPageId === normalizedPageId;
    });

    if (!page || !page.slug) {
      console.log('[getSocialImageUrl] Page not found or no slug:', { pageId, normalizedPageId, hasPage: !!page, hasSlug: !!page?.slug })
      return null;
    }

    console.log('[getSocialImageUrl] Found page:', {
      pageId,
      type: page.type,
      slug: page.slug,
      language: page.language
    })

    // Determine the folder based on page type and slug
    let folder: string;
    
    // Map page types to folder structure based on routing
    if (page.type === 'Post' || page.type === 'Home') {
      folder = 'post';
    } else if (page.type === 'Category') {
      folder = 'category';
    } else if (page.slug === 'all-tags') {
      folder = 'all-tags';
    } else if (page.type === 'Unknown' && page.slug?.startsWith('tag-')) {
      folder = 'tag';
    } else {
      folder = 'root';
    }

    const locale = page.language || 'en';
    const imagePath = `/social-images/${locale}/${folder}/${page.slug}.jpg`;
    
    console.log('[getSocialImageUrl] Generated image path:', {
      pageId,
      folder,
      locale,
      imagePath
    })
    
    return imagePath;
  } catch (err) {
    console.error('[getSocialImageUrl] Error:', err);
    return null;
  }
}
