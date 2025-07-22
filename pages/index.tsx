import { type GetServerSideProps } from 'next'

import type { ExtendedRecordMap,PageInfo, PageProps } from '@/lib/types'
import { Home } from '@/components/home/Home'
import { site } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context
) => {
  const locale = context.locale || 'ko'

  try {
    console.log(`DEBUG: Fetching home page for locale: ${locale}`)
    
    // Get the site map with all pages and navigation tree
    const siteMap = await getSiteMap()
    
    // Find all pages with type 'Home'
    const homePages = Object.values(siteMap.pageInfoMap).filter(
      (page: PageInfo) => page.type === 'Home'
    )

    // Fetch recordMap for each home page
    const homeRecordMaps: { [pageId: string]: ExtendedRecordMap } = {}
    if (homePages.length > 0) {
      const homePageIds = homePages.map((page) => page.pageId)
      const recordMapPromises = homePageIds.map((id) => getPage(id))
      const recordMaps = await Promise.all(recordMapPromises)
      
      for (const [index, recordMap] of recordMaps.entries()) {
        const pageId = homePageIds[index]
        if (pageId) {
          homeRecordMaps[pageId] = recordMap
        }
      }
    }

    return {
      props: {
        site,
        siteMap,
        pageId: 'home', // Add pageId for TopNav to render
        homeRecordMaps
      }
    }
  } catch (err) {
    console.error('Error in getServerSideProps for locale:', locale, err)

    return {
      props: {
        site,
        siteMap: undefined,
        pageId: 'home' // Add pageId for TopNav to render
      }
    }
  }
}

export default function HomePage(props: PageProps) {
  return <Home {...props} />
}