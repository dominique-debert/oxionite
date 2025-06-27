import type { PageProps } from '@/lib/types'
import { NotionPage } from '@/components/NotionPage'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { site } from '@/lib/config'

export const getStaticProps = async () => {
  try {
    console.log('DEBUG: Fetching real data from Notion...')
    
    // Get the site map with all pages and navigation tree
    const siteMap = await getSiteMap()
    
    // Get the root page content
    const recordMap = await getPage(site.rootNotionPageId!)
    
    return {
      props: {
        site: site,
        recordMap: recordMap,
        pageId: site.rootNotionPageId,
        siteMap: siteMap
      },
      revalidate: 10
    }
  } catch (error) {
    console.error('Error in getStaticProps:', error)
    
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
        siteMap: null
      },
      revalidate: 10
    }
  }
}

export default function NotionDomainPage(props: PageProps) {
  return <NotionPage {...props} />
}