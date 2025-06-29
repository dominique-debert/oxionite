import { type GetStaticProps } from 'next'

import type { PageProps } from '@/lib/types'
import { Home } from '@/components/Home'
import { getSiteMap } from '@/lib/get-site-map'
import { site } from '@/lib/config'

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const locale = context.locale || 'ko'

  try {
    console.log(`DEBUG: Fetching home page for locale: ${locale}`)
    
    // Get the site map with all pages and navigation tree
    const siteMap = await getSiteMap()
    
    return {
      props: {
        site: site,
        siteMap: siteMap,
        pageId: 'home' // Add pageId for TopNav to render
      },
      revalidate: 10
    }
  } catch (error) {
    console.error('Error in getStaticProps for locale:', locale, error)
    
    return {
      props: {
        site: site,
        siteMap: undefined,
        pageId: 'home' // Add pageId for TopNav to render
      },
      revalidate: 10
    }
  }
}

export default function HomePage(props: PageProps) {
  return <Home {...props} />
}