import type { ExtendedRecordMap, PageBlock } from 'notion-types'
import { getPageProperty } from 'notion-utils'

import type { CanonicalPageMap, PageInfo, SiteMap } from './types'
import * as config from './config'
import { mapImageUrl } from './map-image-url'
import { notion } from './notion-api'

// Custom function to parse Notion relation properties
function parseRelationProperty(
  propertyId: string,
  block: PageBlock,
  collectionRecordMap: ExtendedRecordMap
): string[] {
  const rawValue = getPageProperty<any[]>(
    propertyId,
    block,
    collectionRecordMap
  )

  if (!rawValue) {
    return []
  }

  // The raw value of a relation property is an array of arrays,
  // where each inner array contains metadata about the related page.
  // The page ID is usually in the format ['‣', [['p', 'page-id']]]
  return rawValue
    .map((item) => {
      if (
        Array.isArray(item) &&
        item.length > 1 &&
        Array.isArray(item[1]) &&
        item[1].length > 0 &&
        Array.isArray(item[1][0]) &&
        item[1][0].length > 1 &&
        typeof item[1][0][1] === 'string'
      ) {
        return item[1][0][1]
      }
      return null
    })
    .filter((id): id is string => !!id)
}

/**
 * The main function to fetch all data from Notion and build the site map.
 * It's memoized to avoid re-fetching data on every call during a single build.
 */
export const getSiteMap = async (): Promise<SiteMap> => {
  const pageInfoMap = await getAllPagesFromDatabase(
    config.rootNotionDatabaseId
  )

  const navigationTree = buildNavigationTree(pageInfoMap)
  const canonicalPageMap = buildCanonicalPageMap(pageInfoMap)

  return {
    site: config.site,
    pageInfoMap,
    navigationTree,
    canonicalPageMap
  }
}

/**
 * Fetches all pages from the root Notion database.
 * @param databaseId The ID of the Notion database.
 * @returns A map of page IDs to their info.
 */
async function getAllPagesFromDatabase(
  databaseId?: string
): Promise<Record<string, PageInfo>> {
  if (!databaseId) {
    console.warn(
      'WARN: `rootNotionDatabaseId` is not defined in `site.config.ts`, so no pages will be rendered.'
    )
    return {}
  }

  console.log('DEBUG: Fetching database:', databaseId)
  
  try {
    const recordMap = await notion.getPage(databaseId)
    console.log('DEBUG: RecordMap keys:', Object.keys(recordMap))
    console.log('DEBUG: Collection keys:', Object.keys(recordMap.collection || {}))
    console.log('DEBUG: Collection view keys:', Object.keys(recordMap.collection_view || {}))
    
    const collectionId = Object.keys(recordMap.collection)[0]
    const collectionViewId = Object.keys(recordMap.collection_view)[0]
    
    if (!collectionId || !collectionViewId) {
      console.error(`ERROR: No collection or collection view found in Notion page ${databaseId}`)
      console.error('Available collections:', recordMap.collection)
      console.error('Available collection views:', recordMap.collection_view)
      return {}
    }

    console.log('DEBUG: Collection ID:', collectionId)
    console.log('DEBUG: Collection View ID:', collectionViewId)

    const collectionData = await notion.getCollectionData(
      collectionId,
      collectionViewId,
      { type: 'table' }
    )

    console.log('DEBUG: Collection data structure:', {
      hasResult: !!collectionData.result,
      resultKeys: collectionData.result ? Object.keys(collectionData.result) : 'No result',
      hasBlockIds: !!(collectionData.result && collectionData.result.blockIds),
      blockIdsLength: collectionData.result && collectionData.result.blockIds ? collectionData.result.blockIds.length : 'No blockIds'
    })

    // Try to get blockIds from different possible locations in the response
    let blockIds: string[] = []
    
    if (collectionData.result?.blockIds) {
      // Direct blockIds (old format)
      blockIds = collectionData.result.blockIds
    } else if (collectionData.result?.reducerResults?.collection_group_results?.blockIds) {
      // New format with reducerResults
      blockIds = collectionData.result.reducerResults.collection_group_results.blockIds
    }

    if (!blockIds || blockIds.length === 0) {
      console.error('ERROR: Collection data is missing blockIds in any expected location')
      console.error('Full collection data:', JSON.stringify(collectionData, null, 2))
      return {}
    }

    // blockIds are already in correct UUID format, no need to convert
    const pageIds = blockIds
    console.log('DEBUG: Found', pageIds.length, 'pages')
    
    const pageInfoMap: Record<string, PageInfo> = {}
    const collectionRecordMap = collectionData.recordMap as ExtendedRecordMap

    for (const pageId of pageIds) {
      const block = collectionRecordMap.block[pageId]?.value
      if (!block) {
        console.warn(`WARN: No block found for pageId: ${pageId}`)
        continue
      }

      const title = getPageProperty<string>('Title', block, collectionRecordMap)
      const slug = getPageProperty<string>('Slug', block, collectionRecordMap)
      const pageType: PageInfo['type'] =
        (getPageProperty<string>(
          'Type',
          block,
          collectionRecordMap
        ) as PageInfo['type']) || 'Unknown'
      const isPublic = getPageProperty<boolean>(
        'Public',
        block,
        collectionRecordMap
      )
      
      const parentPageId = parseRelationProperty(
        'Parent Page',
        block as PageBlock,
        collectionRecordMap
      )[0] || null
      const childrenPageIds = parseRelationProperty(
        'Sub Pages',
        block as PageBlock,
        collectionRecordMap
      )
      const translationOf = parseRelationProperty(
        'Translation of',
        block as PageBlock,
        collectionRecordMap
      )

      console.log(`DEBUG: Parsed relations for ${pageId}:`, {
        title,
        parentPageId,
        childrenPageIds,
        translationOf
      })

      console.log(`DEBUG: Processing page ${pageId}:`, {
        title,
        slug,
        type: pageType,
        public: isPublic,
        parentPageId,
        childrenPageIds,
        translationOf,
        properties: Object.keys(block.properties || {})
      })

      if (!title || !slug || !pageType) {
        console.warn(
          `WARN: Page "${pageId}" (title: "${title}") is missing required properties. Title: ${!!title}, Slug: ${!!slug}, Type: ${!!pageType}. It will be skipped.`
        )
        continue
      }

      // Extract cover image from Notion page format
      const coverImageUrl = (block as PageBlock).format?.page_cover
      const processedCoverImage = coverImageUrl ? mapImageUrl(coverImageUrl, block) : null

      pageInfoMap[pageId] = {
        title,
        pageId,
        slug,
        type: pageType,
        public: isPublic,
        language: getPageProperty<string>('Language', block, collectionRecordMap) || null,
        parentPageId,
        childrenPageIds,
        translationOf,
        description: getPageProperty<string>('Description', block, collectionRecordMap) || null,
        date: getPageProperty<number>('Published', block, collectionRecordMap) ? new Date(getPageProperty<number>('Published', block, collectionRecordMap)!).toISOString() : null,
        coverImage: processedCoverImage,
        coverImageBlock: block,
        status: getPageProperty<string>('status', block, recordMap) || getPageProperty<string>('Status', block, recordMap) || 'draft',
        children: [],
        translations: []
      }
    }

    console.log('DEBUG: Processed', Object.keys(pageInfoMap).length, 'valid pages')
    return pageInfoMap
    
  } catch (err) {
    console.error('ERROR: Failed to fetch from Notion database:', err)
    return {}
  }
}

/**
 * Builds a hierarchical navigation tree from a flat map of page information.
 * @param pageInfoMap A map of page IDs to their info.
 * @returns An array of root-level pages, each with its children nested inside.
 */
function buildNavigationTree(
  pageInfoMap: Record<string, PageInfo>
): PageInfo[] {
  const publicPageInfoMap: Record<string, PageInfo> = Object.fromEntries(
    Object.entries(pageInfoMap).filter(([, pageInfo]) => {
      // Treat `public: null` or `public: undefined` as public for backwards compatibility.
      // Only `public: false` is considered private.
      return pageInfo.public !== false
    })
  )

  const navigationTree: PageInfo[] = []

  console.log('DEBUG: Building navigation tree...')
  console.log('DEBUG: Available public pageIds:', Object.keys(publicPageInfoMap))

  // Find all unique parent IDs that are referenced but don't exist in pageInfoMap
  const allParentIds = new Set<string>()
  for (const pageInfo of Object.values(publicPageInfoMap)) {
    if (pageInfo.parentPageId) {
      allParentIds.add(pageInfo.parentPageId)
    }
  }

  const missingParents = Array.from(allParentIds).filter(
    (parentId) => !publicPageInfoMap[parentId]
  )
  console.log('DEBUG: Missing parent pages:', missingParents)

  // Create a deep copy of pages to avoid circular references
  const createPageCopy = (
    pageId: string,
    visited = new Set<string>()
  ): PageInfo => {
    if (visited.has(pageId)) {
      // Prevent infinite recursion by returning a minimal copy
      const page = publicPageInfoMap[pageId]!
      return {
        ...page,
        children: [],
        translations: []
      }
    }

    visited.add(pageId)
    const page = publicPageInfoMap[pageId]!

    return {
      ...page,
      children: page.childrenPageIds
        .filter((childId) => publicPageInfoMap[childId])
        .map((childId) => createPageCopy(childId, new Set(visited))),
      translations: page.translationOf
        .filter((translationId) => publicPageInfoMap[translationId])
        .map((translationId) => createPageCopy(translationId, new Set(visited)))
    }
  }

  // Find root nodes and build the tree
  for (const pageId of Object.keys(publicPageInfoMap)) {
    const pageInfo = publicPageInfoMap[pageId]!
    const isRoot =
      !pageInfo.parentPageId || !publicPageInfoMap[pageInfo.parentPageId!]

    console.log(
      `DEBUG: Checking page ${pageId} (${
        pageInfo.title
      }): parentPageId=${
        pageInfo.parentPageId
      }, parentExists=${
        pageInfo.parentPageId ? !!publicPageInfoMap[pageInfo.parentPageId] : false
      }, isRoot=${isRoot}`
    )

    if (isRoot) {
      console.log(`DEBUG: Adding ${pageId} (${pageInfo.title}) as root page`)
      navigationTree.push(createPageCopy(pageId))
    }
  }

  console.log('DEBUG: Final navigationTree length:', navigationTree.length)

  return navigationTree
}

/**
 * Builds a map from canonical page URLs (slugs) to page IDs.
 * @param pageInfoMap A map of page IDs to their info.
 * @returns A map of slugs to page IDs.
 */
function buildCanonicalPageMap(
  pageInfoMap: Record<string, PageInfo>
): CanonicalPageMap {
  const canonicalPageMap: CanonicalPageMap = {}

  for (const pageId of Object.keys(pageInfoMap)) {
    const pageInfo = pageInfoMap[pageId]!
    if (pageInfo.public && pageInfo.slug) {
      if (canonicalPageMap[pageInfo.slug]) {
        console.warn(
          `WARN: Duplicate slug "${pageInfo.slug}" found for pages "${pageId}" and "${canonicalPageMap[pageInfo.slug]}". This may cause unexpected behavior.`
        )
      }
      canonicalPageMap[pageInfo.slug] = pageId
    }
  }

  return canonicalPageMap
}