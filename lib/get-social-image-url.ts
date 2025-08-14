import { parseUrlPathname } from './context/url-parser';
import siteLocale from '../site.locale.json';

export async function getSocialImageUrl(
  url: string,
): Promise<string | null> {
  try {
    console.log('[getSocialImageUrl] Starting with url:', url)
    
    // Parse URL to extract routing information
    const parsedUrl = parseUrlPathname(url);
    console.log('[getSocialImageUrl] Parsed URL:', parsedUrl);

    const locale = parsedUrl.locale || siteLocale.defaultLocale;
    console.log('[getSocialImageUrl] Determined locale:', { 
      urlLocale: parsedUrl.locale, 
      finalLocale: locale,
      fullUrl: url,
      pathname: parsedUrl.fullPath 
    });
    let folder: string;
    let targetSlug: string;

    // Determine folder and target slug based on parsed URL
    if (parsedUrl.isRoot) {
      folder = 'root';
      targetSlug = 'root';
    } else if (parsedUrl.isPost) {
      folder = 'post';
      targetSlug = parsedUrl.isSubpage ? parsedUrl.subpage : parsedUrl.slug;
    } else if (parsedUrl.isCategory) {
      folder = 'category';
      targetSlug = parsedUrl.slug;
    } else if (parsedUrl.isAllTags) {
      folder = 'all-tags';
      targetSlug = 'all-tags';
    } else if (parsedUrl.isTag) {
      folder = 'tag';
      targetSlug = parsedUrl.slug;
    } else {
      folder = 'root';
      targetSlug = 'root';
    }

    // Construct the specific image path
    const specificImagePath = `/social-images/${locale}/${folder}/${targetSlug}.jpg`;
    
    // For root pages, use the correct path format
    if (folder === 'root') {
      const rootImagePath = `/social-images/${locale}/root.jpg`;
      console.log('[getSocialImageUrl] Using root image path:', rootImagePath);
      return rootImagePath;
    }
    
    // Return the specific image path - Next.js will handle 404s gracefully
    console.log('[getSocialImageUrl] Returning specific image path:', specificImagePath);
    return specificImagePath;
  } catch (err) {
    console.error('[getSocialImageUrl] Error:', err);
    // Return root as fallback using configured default locale
    return `/social-images/${siteLocale.defaultLocale}/root.jpg`;
  }
}

