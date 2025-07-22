import { type ParsedUrlQuery } from 'node:querystring'

import { type GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { parsePageId } from 'notion-utils'

import { CategoryPage } from '@/components/CategoryPage'
import { Loading } from '@/components/Loading'
import { NotionPage } from '@/components/NotionPage'
import { PagePrivate } from '@/components/PagePrivate'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { type PageInfo,type PageProps } from '@/lib/types'

interface SlugParams extends ParsedUrlQuery {
  slug: string[]
}

export const getServerSideProps: GetServerSideProps<
  PageProps,
  SlugParams
> = async (context) => {
  const slugParts = context.params!.slug
  const topLevelSlug = slugParts[0] // Slug for finding the top-level post
  const locale = context.locale || 'ko' // Fallback to default locale

  try {
    const siteMap = await getSiteMap()

    // Find the top-level page info based on the first part of the URL slug.
    let topLevelPageId: string | null = null
    let topLevelPageInfo: PageInfo | null = null

    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      if (pageInfo.language === locale && pageInfo.slug === topLevelSlug) {
        topLevelPageId = pageId
        topLevelPageInfo = pageInfo
        break
      }
    }

    if (!topLevelPageId || !topLevelPageInfo) {
      console.log(
        `DEBUG: Top-level page not found for locale='${locale}' slug='${topLevelSlug}'`
      )
      return {
        notFound: true
      }
    }

    // Check if the page is public.
    if (topLevelPageInfo.public === false) {
      return {
        props: {
          site: siteMap.site,
          siteMap,
          pageId: topLevelPageId,
          isPrivate: true
        }
      }
    }

    // Determine the actual page ID to render.
    const finalSlug = slugParts.at(-1)
    const pageIdToRender = parsePageId(finalSlug) || topLevelPageId

    // Fetch the content for the page we are actually going to render.
    const recordMap = await getPage(pageIdToRender)

    return {
      props: {
        site: siteMap.site,
        recordMap,
        pageId: pageIdToRender,
        siteMap,
        // Pass the top-level page info to be used for breadcrumbs
        topLevelPageInfo: topLevelPageInfo || null
      }
    }
  } catch (err) {
    console.error('page error', locale, slugParts.join('/'), err)
    throw err
  }
}

export default function SlugPage({ showTOC, ...props }: PageProps) {
  const router = useRouter()

  if (router.isFallback) {
    return <Loading />
  }

  // Handle private pages first.
  if (props.isPrivate) {
    return <PagePrivate />
  }

  const { siteMap, pageId } = props

  // Get page info to determine the type.
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null

  // Render CategoryPage for 'Category' type, NotionPage for other types like 'Post'.
  // Note: Sub-pages within a post will not have `pageInfo` from the siteMap,
  // so we render NotionPage by default.
  if (pageInfo?.type === 'Category') {
    return <CategoryPage pageProps={props} />
  }

  return <NotionPage {...props} showTOC={showTOC} />
}