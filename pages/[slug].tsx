import { type GetStaticProps, type GetStaticPaths } from 'next'
import { type ParsedUrlQuery } from 'querystring'
import { useRouter } from 'next/router'

import { NotionPage } from '@/components/NotionPage'
import { CategoryPage } from '@/components/CategoryPage'
import { Loading } from '@/components/Loading'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { type PageProps } from '@/lib/types'
import { isDev } from '@/lib/config'

interface SlugParams extends ParsedUrlQuery {
  slug: string
}

export const getStaticProps: GetStaticProps<PageProps, SlugParams> = async (
  context
) => {
  const slug = context.params!.slug
  const locale = context.locale || 'ko' // fallback to default

  try {
    console.log(`DEBUG: Looking for locale=${locale}, slug=${slug}`)
    const siteMap = await getSiteMap()
    
    // Find page by matching language and slug
    let foundPageId: string | null = null
    let foundPageInfo = null
    
    console.log(`DEBUG: Searching for locale='${locale}' slug='${slug}'`)
    console.log(`DEBUG: Available pages:`)
    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      console.log(`  - ${pageId}: language='${pageInfo.language}' slug='${pageInfo.slug}' title='${pageInfo.title}'`)
      if (pageInfo.language === locale && pageInfo.slug === slug) {
        foundPageId = pageId
        foundPageInfo = pageInfo
        console.log(`DEBUG: MATCH FOUND! pageId=${pageId}`)
        break
      }
    }
    
    console.log(`DEBUG: Found pageId for locale='${locale}' slug='${slug}':`, foundPageId)
    
    if (!foundPageId || !foundPageInfo) {
      console.log(`DEBUG: Page not found for locale='${locale}' slug='${slug}'`)
      return {
        notFound: true
      }
    }

    const recordMap = await getPage(foundPageId)

    return {
      props: {
        site: siteMap.site,
        recordMap,
        pageId: foundPageId,
        siteMap
      },
      revalidate: 10
    }
  } catch (err) {
    console.error('page error', locale, slug, err)
    throw err
  }
}

export const getStaticPaths: GetStaticPaths<SlugParams> = async () => {
  if (isDev) {
    return {
      paths: [],
      fallback: 'blocking'
    }
  }

  const siteMap = await getSiteMap()
  const paths: { params: SlugParams; locale?: string }[] = []

  // Generate paths for all pages with their respective locales
  Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
    if (pageInfo && pageInfo.language && pageInfo.slug) {
      paths.push({
        params: {
          slug: pageInfo.slug
        },
        locale: pageInfo.language
      })
    }
  })

  console.log('Generated slug static paths for', paths.length, 'pages')

  return {
    paths,
    fallback: true
  }
}

export default function SlugPage(props: PageProps) {
  const router = useRouter()

  if (router.isFallback) {
    return <Loading />
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