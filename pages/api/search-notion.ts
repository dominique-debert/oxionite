import type { ExtendedRecordMap } from 'notion-types'
import { type NextApiRequest, type NextApiResponse } from 'next'
import { getBlockTitle } from 'notion-utils'

import type * as types from '../../lib/types'
import { buildPageUrl } from '../../lib/build-page-url'
import { getPageBreadcrumb } from '../../lib/get-page-breadcrumb'
import { getSiteMap } from '../../lib/get-site-map'
import { search } from '../../lib/notion'

export default async function searchNotion(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  const searchParams: types.SearchParams = req.body

  console.log('<<< lambda search-notion', searchParams)

  // Fetch site map and search results
  const siteMap = await getSiteMap()
  const results = await search(searchParams)

  // Use the recordMap from the search results to resolve titles
  const recordMap = results.recordMap as ExtendedRecordMap

  const augmentedResults = results.results
    .map((result) => {
      const block = recordMap.block[result.id]?.value
      if (!block) {
        return null
      }

      const pageInfo = siteMap.pageInfoMap[result.id]
      if (!pageInfo) {
        return null
      }

      const title = getBlockTitle(block, recordMap)
      const url = buildPageUrl(result.id, siteMap)
      const type = pageInfo.type
      const breadcrumb = getPageBreadcrumb(result.id, siteMap)

      if (!title) {
        return null
      }

      return {
        id: result.id,
        title,
        type,
        url,
        breadcrumb
      }
    })
    .filter(Boolean)
    .filter((result) => result && (result.type === 'Post' || result.type === 'Category'))

  console.log(`>>> lambda search-notion (${augmentedResults.length} results)`)

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
  )
  res.status(200).json({ results: augmentedResults })
}
