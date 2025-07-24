import { type GetStaticProps } from 'next'

import type { ExtendedRecordMap, PageProps } from '@/lib/types'
import { Home } from '@/components/home/Home'
import { site } from '@/lib/config'
import { getPage } from '@/lib/notion'
import { getCachedSiteMap } from '@/lib/site-cache'

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const locale = context.locale || 'ko'

  try {
    console.log(`DEBUG: Fetching home page for locale: ${locale}`)
    
    // Get the site map with all pages and navigation tree
    const siteMap = await getCachedSiteMap()
    
    // Find all pages with type 'Home'
    const homePages = []
    for (const pageInfo of Object.values(siteMap.pageInfoMap)) {
      if (pageInfo.type === 'Home') {
        homePages.push(pageInfo)
      }
    }

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
      },
      revalidate: 60
    }
  } catch (err) {
    console.error('Error in getServerSideProps for locale:', locale, err)

    return {
      props: {
        site,
        siteMap: undefined,
        pageId: 'home' // Add pageId for TopNav to render
      },
      revalidate: 60
    }
  }
}

export default function HomePage(props: PageProps) {
  return <Home {...props} />
}