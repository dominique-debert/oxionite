import type { SiteMap } from './types'

/**
 * Builds hierarchical URLs for pages based on current navigation context.
 * - Root pages: /post/{slug}
 * - Subpages: /post/{current-slug}/{subpage-title}-{pageId}
 * - Deep nested: /post/{current-slug}/{parent-title}-{parentId}/{subpage-title}-{pageId}
 */
export function buildPageUrl(
  pageId: string,
  siteMap: SiteMap,
  currentPath: string[] = []
): string {
  const pageInfo = siteMap.pageInfoMap[pageId]
  
  // Root page (Post/Home with slug)
  if (pageInfo && (pageInfo.type === 'Post' || pageInfo.type === 'Home')) {
    return `/post/${pageInfo.slug}`
  }
  
  // Subpage - use current path context
  if (currentPath.length > 0) {
    const currentSlug = currentPath[0] // The root slug
    const subpageTitle = pageInfo?.title || 'page'
    const subpageSlug = subpageTitle.toLowerCase().replace(/\s+/g, '-')
    
    // Build hierarchical path: /post/{root-slug}/{hierarchy}-{pageId}
    const pathSegments = [...currentPath]
    if (pathSegments.length === 1) {
      // Direct subpage of root
      return `/post/${currentSlug}/${subpageSlug}-${pageId}`
    } else {
      // Deep nested
      return `/post/${currentSlug}/${pathSegments.slice(1).join('/')}/${subpageSlug}-${pageId}`
    }
  }
  
  // Fallback - direct page access
  return `/post/${pageId}`
}

/**
 * Extracts page ID from URL segments
 */
export function extractPageIdFromUrl(segments: string[]): string {
  if (segments.length === 0) return ''
  
  const lastSegment = segments[segments.length - 1]
  
  // Handle format: {title}-{pageId} where pageId is a UUID with hyphens
  // UUID format: 8-4-4-4-12 hex digits (36 chars total with hyphens)
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i
  const match = lastSegment.match(uuidRegex)
  
  if (match) {
    return match[1]
  }
  
  return lastSegment
}

/**
 * Builds breadcrumb from URL segments
 */
export function buildBreadcrumb(segments: string[], siteMap: SiteMap): Array<{title: string, href: string}> {
  const breadcrumbs = []
  let currentPath = ''
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    
    if (i === 0) {
      // Root page
      const pageInfo = Object.values(siteMap.pageInfoMap).find(p => p.slug === segment)
      breadcrumbs.push({
        title: pageInfo?.title || segment,
        href: `/post/${segment}`
      })
    } else {
      // Subpage
      const pageId = extractPageIdFromUrl([segment])
      breadcrumbs.push({
        title: segment.replace(`-${pageId}`, ''),
        href: `/post/${segments.slice(0, i + 1).join('/')}`
      })
    }
  }
  
  return breadcrumbs
}
