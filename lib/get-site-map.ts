import type { ExtendedRecordMap, PageBlock } from 'notion-types'
import { getPageProperty, idToUuid } from 'notion-utils'
import pMemoize from 'p-memoize'

import type { CanonicalPageMap, PageInfo, SiteMap } from './types'
import * as config from './config'
import { mapImageUrl } from './map-image-url'
import { notion } from './notion-api'

export async function getSiteMap(): Promise<SiteMap> {
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
 * The main function to fetch all data from Notion and build the site map.
 * It's memoized to avoid re-fetching data on every call during a single build.
 */
export const getSiteMapMemoized = pMemoize(getSiteMap)

/**
 * Fetches all pages from the root Notion database.
 * @param databaseId The ID of the Notion database.
 * @returns A map of page IDs to their info.
 */
async function getAllPagesFromDatabase(
  databaseId?: string
): Promise<Record<string, PageInfo>> {
  if (!databaseId) {
    return {}
  }

  try {
    const recordMap = await notion.getPage(databaseId)
    const collectionId = Object.keys(recordMap.collection)[0]
    const collectionViewId = Object.keys(recordMap.collection_view)[0]

    if (!collectionId || !collectionViewId) {
      return {}
    }

    const collectionData = await notion.getCollectionData(
      collectionId,
      collectionViewId,
      { type: 'table' }
    )

    let blockIds: string[] = []
    if (collectionData.result?.blockIds) {
      blockIds = collectionData.result.blockIds
    } else if (
      collectionData.result?.reducerResults?.collection_group_results?.blockIds
    ) {
      blockIds =
        collectionData.result.reducerResults.collection_group_results.blockIds
    }

    if (!blockIds || blockIds.length === 0) {
      return {}
    }

    const pageIds = blockIds
    const pageInfoMap: Record<string, PageInfo> = {}
    const collectionRecordMap = collectionData.recordMap as ExtendedRecordMap

    for (const pageId of pageIds) {
      const block = collectionRecordMap.block[pageId]?.value
      if (!block) {
        continue
      }

      const title = getPageProperty<string>('Title', block, collectionRecordMap)
      const type =
        (getPageProperty<string>(
          'Type',
          block,
          collectionRecordMap
        ) as PageInfo['type']) || 'Page'
      const status =
        getPageProperty<string>('Status', block, collectionRecordMap) || 'Draft'
      const isPublic = status === 'Public'
      const slug = getPageProperty<string>('Slug', block, collectionRecordMap)
      const language = getPageProperty<string>(
        'Language',
        block,
        collectionRecordMap
      )
      const parentPageId = getPageProperty<string>(
        'Parent',
        block,
        collectionRecordMap
      )
      const translationOf = getPageProperty<string>(
        'Translation',
        block,
        collectionRecordMap
      )
      const date = getPageProperty<number>('Date', block, collectionRecordMap)
      const description = getPageProperty<string>(
        'Description',
        block,
        collectionRecordMap
      )

      const childrenPageIds = parseRelationProperty(
        'Children',
        block as PageBlock,
        collectionRecordMap
      )

      const cover = (block as PageBlock).format?.page_cover
      const coverPosition = (block as PageBlock).format?.page_cover_position || 0.5
      const processedCoverImage = cover ? mapImageUrl(cover, block) : null

      pageInfoMap[pageId] = {
        pageId,
        title,
        slug,
        type,
        status,
        public: isPublic,
        language: language || null,
        parentPageId: parentPageId || null,
        translationOf: translationOf ? [translationOf] : [],
        childrenPageIds,
        date: date ? new Date(date).toISOString() : null,
        description: description || null,
        coverImage: processedCoverImage,
        coverImageBlock: block as PageBlock,
        children: [],
        translations: []
      }
    }

    return pageInfoMap
  } catch (err) {
    console.error('ERROR: Failed to fetch from Notion database:', err)
    return {}
  }
}

function parseRelationProperty(
  propertyId: string,
  block: PageBlock,
  recordMap: ExtendedRecordMap
): string[] {
  try {
    const rawValue = getPageProperty<any[]>(propertyId, block, recordMap)
    if (!rawValue || !Array.isArray(rawValue)) return []

    if (Array.isArray(rawValue[0]) && rawValue[0][0] === '‣') {
      const relatedPageIds = rawValue.map((relation) => {
        if (
          Array.isArray(relation) &&
          relation.length > 1 &&
          Array.isArray(relation[1]) &&
          relation[1].length > 0
        ) {
          const relationDetails = relation[1][0]
          if (Array.isArray(relationDetails) && relationDetails.length > 1) {
            return relationDetails[1]
          }
        }
        return null
      })
      return relatedPageIds.filter((id): id is string => !!id)
    }
  } catch (error) {
    console.error(
      `Error parsing relation property '${propertyId}' for page ${block.id}:`,
      error
    )
  }
  return []
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
      return pageInfo.public !== false
    })
  )

  const navigationTree: PageInfo[] = []

  const createPageCopy = (
    pageId: string,
    visited = new Set<string>()
  ): PageInfo => {
    if (visited.has(pageId)) {
      const page = publicPageInfoMap[pageId]! as PageInfo
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

  for (const pageId of Object.keys(publicPageInfoMap)) {
    const pageInfo = publicPageInfoMap[pageId]!
    const isRoot =
      !pageInfo.parentPageId || !publicPageInfoMap[pageInfo.parentPageId!]

    if (isRoot) {
      navigationTree.push(createPageCopy(pageId))
    }
  }

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
        // console.warn(
        //   `WARN: Duplicate slug "${pageInfo.slug}" found for pages "${pageId}" and "${canonicalPageMap[pageInfo.slug]}". This may cause unexpected behavior.`
        // )
      }
      canonicalPageMap[pageInfo.slug] = pageId
    }
  }

  return canonicalPageMap
}