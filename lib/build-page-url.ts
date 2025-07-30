import type { PageInfo,SiteMap } from './types'



/**
 * Builds the proper hierarchical URL for a given page ID based on page type.
 * - Posts: /post/{slug}
 * - Categories: /category/{slug}
 * - SubPages: /{parent-slug}/{sub-page-slug}
 * - Home: /
 */
export const buildPageUrl = (pageId: string, siteMap: SiteMap): string => {
  const pageInfoMap = siteMap.pageInfoMap
  const pageInfo: PageInfo | undefined = pageInfoMap[pageId]
  
  if (!pageInfo) {
    // Fallback for pages not found
    return `/${pageId}`
  }

  // Handle Home page
  if (pageInfo.slug === 'index' && !pageInfo.parentPageId) {
    return '/'
  }

  // Handle Posts and Categories with new routing
  if (pageInfo.type === 'Post') {
    return `/post/${pageInfo.slug}`
  }
  
  if (pageInfo.type === 'Category') {
    return `/category/${pageInfo.slug}`
  }

  // For other page types (like SubPages), build hierarchical path
  let currentPageId: string | undefined = pageId
  const path: string[] = []

  while (currentPageId) {
    const currentPageInfo: PageInfo | undefined = pageInfoMap[currentPageId]
    if (!currentPageInfo) break

    path.unshift(currentPageInfo.slug)

    // Check if the current page is a top-level page in the navigation tree
    const idInLoop = currentPageId
    const isTopLevel = siteMap.navigationTree.some(
      (item) => item.pageId === idInLoop
    )
    if (isTopLevel) {
      break
    }

    currentPageId = currentPageInfo.parentPageId || undefined
  }

  if (path.length === 0) {
    return `/${pageId}`
  }

  return `/${path.join('/')}`
}
