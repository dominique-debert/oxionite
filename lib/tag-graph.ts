import type { SiteMap } from './types'

export interface TagGraphData {
  // Tag frequency counts
  tagCounts: Record<string, number>
  
  // Tag relationships (co-occurrences) - using array for JSON serialization
  tagRelationships: Record<string, string[]>
  
  // Which pages contain each tag for reverse lookup
  tagPages: Record<string, string[]>
  
  // Metadata
  totalPosts: number
  lastUpdated: number
}

export function buildTagGraphData(siteMap: SiteMap): TagGraphData {
  const tagCounts: Record<string, number> = {}
  const tagRelationships: Record<string, Set<string>> = {}
  const tagPages: Record<string, string[]> = {}

  // Filter only Post and Home type pages with tags
  const relevantPages = Object.values(siteMap.pageInfoMap).filter(
    page => (page.type === 'Post' || page.type === 'Home') && 
            page.tags && 
            page.tags.length > 0
  )

  for (const page of relevantPages) {
    const tags = [...new Set(page.tags || [])] // Remove duplicates and sort
    
    // Track which pages have which tags
    for (const tag of tags) {
      if (!tagPages[tag]) {
        tagPages[tag] = []
      }
      if (!tagPages[tag].includes(page.pageId)) {
        tagPages[tag].push(page.pageId)
      }
      
      // Count tag occurrences
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
    
    // Build relationships (co-occurrences within same post)
    if (tags.length >= 2) {
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const [t1, t2] = [tags[i], tags[j]].sort()
          
          if (!tagRelationships[t1]) {
            tagRelationships[t1] = new Set()
          }
          tagRelationships[t1].add(t2)
        }
      }
    }
  }
  
  // Convert Sets to sorted arrays for JSON serialization
  const sortedTagRelationships: Record<string, string[]> = {}
  for (const [tag, relatedTags] of Object.entries(tagRelationships)) {
    sortedTagRelationships[tag] = Array.from(relatedTags).sort()
  }

  // Sort tag pages for consistent ordering
  const sortedTagPages: Record<string, string[]> = {}
  for (const [tag, pages] of Object.entries(tagPages)) {
    sortedTagPages[tag] = [...new Set(pages)].sort()
  }

  return {
    tagCounts,
    tagRelationships: sortedTagRelationships,
    tagPages: sortedTagPages,
    totalPosts: relevantPages.length,
    lastUpdated: Date.now()
  }
}

export function getTopTags(tagGraphData: TagGraphData, limit: number = 20): Array<[string, number]> {
  return Object.entries(tagGraphData.tagCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, limit)
}

export function getRelatedTags(tagGraphData: TagGraphData, tagName: string): string[] {
  return tagGraphData.tagRelationships[tagName] || []
}

export function getPagesWithTag(tagGraphData: TagGraphData, tagName: string): string[] {
  return tagGraphData.tagPages[tagName] || []
}
