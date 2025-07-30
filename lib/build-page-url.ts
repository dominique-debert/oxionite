import type { SiteMap } from './types'

/**
 * Builds hierarchical URLs for pages.
 * - Root pages: /post/{slug}
 * - Subpages: /post/{root-slug}/{subpage-id}
 */
export function buildPageUrl(
  pageId: string,
  siteMap: SiteMap,
  rootSlug?: string
): string {
  if (rootSlug) {
    return `/post/${rootSlug}/${pageId}`
  }

  const pageInfo = siteMap.pageInfoMap[pageId]
  if (pageInfo?.slug) {
    return `/post/${pageInfo.slug}`
  }

  return `/post/${pageId}`
}
