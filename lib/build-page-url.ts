import type { SiteMap } from './types'

/**
 * Builds the proper hierarchical URL for a given page ID based on page type.
 * - Posts: /post/{slug}
 * - Categories: /category/{slug}
 * - SubPages: /post/{current-slug}/{subpage-slug}
 * - Home: /
 */
export function buildPageUrl(
  pageId: string, 
  siteMap: SiteMap, 
  currentPageSlug?: string  // 현재 페이지의 slug (subpage URL 구성용)
): string {
  const pageInfoMap = siteMap.pageInfoMap
  const pageInfo = pageInfoMap[pageId]

  if (!pageInfo) {
    return '/'
  }

  const { type, slug } = pageInfo

  // Handle home page - but route to /post/{slug}  // Handle posts and home pages (both go to /post/)
  if (type === 'Post' || type === 'Home') {
    return `/post/${slug}`
  }

  // Handle categories
  if (type === 'Category') {
    return `/category/${slug}`
  }

  // For subpages (pages not in Notion DB), use current page slug as base
  if (currentPageSlug) {
    // If we're on a post or home page, subpages go under /post/{current-slug}/{subpage-slug}
    return `/post/${currentPageSlug}/${slug}`
  }

  // Fallback for pages without context
  return `/${slug}`
}
