import { type GetServerSideProps } from 'next'
import { type ParsedUrlQuery } from 'querystring'
import { useRouter } from 'next/router'

import { NotionPage } from '@/components/NotionPage'
import { CategoryPage } from '@/components/CategoryPage'
import { Loading } from '@/components/Loading'
import { PagePrivate } from '@/components/PagePrivate'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { type PageProps, type PageInfo } from '@/lib/types'
import { isDev } from '@/lib/config'

interface SlugParams extends ParsedUrlQuery {
  slug: string
}

export const getServerSideProps: GetServerSideProps<
  PageProps,
  SlugParams
> = async (context) => {
  const slug = context.params!.slug
  const locale = context.locale || 'ko' // fallback to default

  try {
    console.log(`DEBUG: Looking for locale=${locale}, slug=${slug}`)
    const siteMap = await getSiteMap()

    // Find page by matching language and slug from the complete map
    let foundPageId: string | null = null
    let foundPageInfo: PageInfo | null = null

    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      if (pageInfo.language === locale && pageInfo.slug === slug) {
        foundPageId = pageId
        foundPageInfo = pageInfo
        break
      }
    }

    if (!foundPageId || !foundPageInfo) {
      console.log(`DEBUG: Page not found for locale='${locale}' slug='${slug}'`)
      return {
        notFound: true
      }
    }

    // Check if the page is public
    if (foundPageInfo.public === false) {
      return {
        props: {
          site: siteMap.site,
          siteMap,
          pageId: foundPageId,
          isPrivate: true
        }
      }
    }

    const recordMap = await getPage(foundPageId)

    return {
      props: {
        site: siteMap.site,
        recordMap,
        pageId: foundPageId,
        siteMap
      }
    }
  } catch (err) {
    console.error('page error', locale, slug, err)
    throw err
  }
}

export default function SlugPage(props: PageProps) {
  const router = useRouter()

  if (router.isFallback) {
    return <Loading />
  }

  // Handle private pages first
  if (props.isPrivate) {
    return <PagePrivate />
  }

  const { siteMap, pageId } = props

  // Get page info to determine the type
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null

  // Render CategoryPage for Category type, NotionPage for Post type
  if (pageInfo?.type === 'Category') {
    return <CategoryPage pageProps={props} />
  }

  return <NotionPage {...props} />
} 