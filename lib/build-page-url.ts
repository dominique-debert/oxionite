import type { SiteMap, PageInfo } from './types'



/**
 * Builds the proper hierarchical URL for a given page ID.
 * - For Posts and Categories, it's a simple /slug.
 * - For SubPages, it constructs the full path e.g., /post-slug/sub-page-slug.
 */
export const buildPageUrl = (pageId: string, siteMap: SiteMap): string => {
  const pageInfoMap = siteMap.pageInfoMap
  let currentPageId: string | undefined = pageId
  const path: string[] = []

  while (currentPageId) {
    const pageInfo: PageInfo | undefined = pageInfoMap[currentPageId]
    if (!pageInfo) {
      // This page is not in the site map
      break
    }

    path.unshift(pageInfo.slug)

    // Check if the current page is a top-level page in the navigation tree
    const isTopLevel = siteMap.navigationTree.some(
      (item) => item.pageId === currentPageId
    )
    if (isTopLevel) {
      // We've reached the top of the hierarchy for this branch
      break
    }

    currentPageId = pageInfo.parentPageId || undefined
  }

  if (path.length === 0) {
    // Fallback for pages not found or other errors
    return `/${pageId}`
  }

  // Handle Home page case where slug is 'index'
  if (path.length === 1 && path[0] === 'index') {
    return '/'
  }

  return `/${path.join('/')}`
}
