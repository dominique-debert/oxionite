import type * as types from './types'

export const getPageBreadcrumb = (
  pageId: string,
  siteMap: types.SiteMap
): string | null => {
  const pageInfoMap = siteMap.pageInfoMap
  let currentPageId: string | undefined = pageId
  const breadcrumbs: string[] = []

  while (currentPageId) {
    const pageInfo: types.PageInfo | undefined = pageInfoMap[currentPageId]
    if (!pageInfo) {
      // This page is not in the site map
      break
    }

    breadcrumbs.unshift(pageInfo.title || 'Untitled')

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

  return breadcrumbs.length > 1 ? breadcrumbs.join(' / ') : null
}
