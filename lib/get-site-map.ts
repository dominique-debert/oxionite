import pMemoize from 'p-memoize'
import { getPageProperty, idToUuid } from 'notion-utils'
import type { ExtendedRecordMap } from 'notion-types'

import type * as types from './types'
import * as config from './config'
import { notion } from './notion-api'

/**
 * The main function to fetch all data from Notion and build the site map.
 * It's memoized to avoid re-fetching data on every call during a single build.
 */
export const getSiteMap = pMemoize(
  async (): Promise<types.SiteMap> => {
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
)

/**
 * Fetches all pages from the root Notion database.
 * @param databaseId The ID of the Notion database.
 * @returns A map of page IDs to their info.
 */
async function getAllPagesFromDatabase(
  databaseId?: string
): Promise<Record<string, types.PageInfo>> {
  if (!databaseId) {
    console.warn(
      'WARN: `rootNotionDatabaseId` is not defined in `site.config.ts`, so no pages will be rendered.'
    )
    return {}
  }

  const recordMap = await notion.getPage(databaseId)
  const collectionId = Object.keys(recordMap.collection)[0]
  const collectionViewId = Object.keys(recordMap.collection_view)[0]
  if (!collectionId || !collectionViewId) {
    console.error(`ERROR: No collection or collection view found in Notion page ${databaseId}`)
    return {}
  }

  const collectionData = await notion.getCollectionData(
    collectionId,
    collectionViewId,
    { type: 'table' }
  )

  const pageIds = collectionData.result.blockIds.map(idToUuid)
  const pageInfoMap: Record<string, types.PageInfo> = {}
  const collectionRecordMap = collectionData.recordMap as ExtendedRecordMap

  for (const pageId of pageIds) {
    const block = collectionRecordMap.block[pageId]?.value
    if (!block) continue

    const title = getPageProperty<string>('Title', block, collectionRecordMap)
    const slug = getPageProperty<string>('Slug', block, collectionRecordMap)
    const type = getPageProperty<string>('Type', block, collectionRecordMap)
    const isPublic = getPageProperty<boolean>('Public', block, collectionRecordMap)

    if (!title || !slug || !type) {
      if (isPublic) {
        console.warn(
          `WARN: Page "${pageId}" is public but is missing required properties (Title, Slug, or Type). It will be skipped.`
        )
      }
      continue
    }

    pageInfoMap[pageId] = {
      title,
      pageId,
      slug,
      type: type as types.PageInfo['type'],
      public: isPublic,
      language: getPageProperty<string>('Language', block, collectionRecordMap) || null,
      parentPageId: getPageProperty<string[]>('Parent', block, collectionRecordMap)?.[0] || null,
      childrenPageIds: getPageProperty<string[]>('Children', block, collectionRecordMap) || [],
      translationOf: getPageProperty<string[]>('Translation Of', block, collectionRecordMap) || [],
      description: getPageProperty<string>('Description', block, collectionRecordMap) || null,
      published: getPageProperty<number>('Published', block, collectionRecordMap) ? new Date(getPageProperty<number>('Published', block, collectionRecordMap)!) : null,
      lastUpdated: getPageProperty<number>('Last Updated', block, collectionRecordMap) ? new Date(getPageProperty<number>('Last Updated', block, collectionRecordMap)!) : null,
      children: [],
      translations: []
    }
  }

  return pageInfoMap
}

/**
 * Builds a hierarchical navigation tree from a flat map of page information.
 * @param pageInfoMap A map of page IDs to their info.
 * @returns An array of root-level pages, each with its children nested inside.
 */
function buildNavigationTree(
  pageInfoMap: Record<string, types.PageInfo>
): types.PageInfo[] {
  const navigationTree: types.PageInfo[] = []

  // First pass: link parent, children, and translation objects
  for (const pageId of Object.keys(pageInfoMap)) {
    const pageInfo = pageInfoMap[pageId]!
    const { parentPageId, childrenPageIds, translationOf } = pageInfo

    if (parentPageId && pageInfoMap[parentPageId]) {
      pageInfo.parent = pageInfoMap[parentPageId]
    }

    for (const childId of childrenPageIds) {
      if (pageInfoMap[childId]) {
        pageInfo.children.push(pageInfoMap[childId]!)
      }
    }

    for (const translationId of translationOf) {
      if (pageInfoMap[translationId]) {
        pageInfo.translations.push(pageInfoMap[translationId]!)
      }
    }
  }

  // Second pass: find the root nodes of the tree
  for (const pageId of Object.keys(pageInfoMap)) {
    const pageInfo = pageInfoMap[pageId]!
    if (!pageInfo.parent) {
      navigationTree.push(pageInfo)
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
  pageInfoMap: Record<string, types.PageInfo>
): types.CanonicalPageMap {
  const canonicalPageMap: types.CanonicalPageMap = {}

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