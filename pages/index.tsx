import { type GetStaticProps } from 'next'

import type { PageProps } from '@/lib/types'
import { NotionPage } from '@/components/NotionPage'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { site } from '@/lib/config'

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const locale = context.locale || 'ko'

  try {
    console.log(`DEBUG: Fetching home page for locale: ${locale}`)
    
    // Get the site map with all pages and navigation tree
    const siteMap = await getSiteMap()
    
    // Get the root page content
    const recordMap = await getPage(site.rootNotionPageId!)
    
    return {
      props: {
        site: site,
        recordMap: recordMap,
        pageId: site.rootNotionPageId!,
        siteMap: siteMap
      },
      revalidate: 10
    }
  } catch (error) {
    console.error('Error in getStaticProps for locale:', locale, error)
    
    // Fallback to a simple page without navigation
    const dummyRecordMap = {
      block: {
        'fake-id': {
          role: 'reader',
          value: {
            id: 'fake-id',
            version: 1,
            type: 'page',
            properties: { title: [['Error Loading Page']] },
            permissions: [{ role: 'reader', type: 'public_permission' }],
            parent_id: 'fake-parent',
            parent_table: 'space'
          }
        }
      }
    }

    return {
      props: {
        site: site,
        recordMap: dummyRecordMap as any,
        pageId: 'fake-id',
        siteMap: undefined
      },
      revalidate: 10
    }
  }
}

export default function HomePage(props: PageProps) {
  return <NotionPage {...props} />
}