import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../../next-i18next.config.cjs'

import { NotionPage } from '@/components/NotionPage'
import type * as types from '@/lib/context/types'
import { getCachedSiteMap } from '@/lib/context/site-cache'
import { getPage } from '@/lib/notion'
import { site } from '@/lib/config'
import siteConfig from '../../site.config'

export interface NestedPostPageProps {
  site: types.Site
  siteMap: types.SiteMap
  pageId: string
  recordMap?: types.ExtendedRecordMap
  isPrivate?: boolean
}

export default function NestedPostPage({ site, siteMap, pageId, recordMap, isPrivate }: NestedPostPageProps) {
  if (isPrivate) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '4rem 2rem',
        textAlign: 'center',
        color: 'var(--secondary-text-color)'
      }}>
        <h1>Private Page</h1>
        <p>This page is private and cannot be accessed.</p>
      </div>
    )
  }

  const pageProps: types.PageProps = {
    site,
    siteMap,
    pageId,
    recordMap,
  }

  return <NotionPage {...pageProps} />
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const siteMap = await getCachedSiteMap()
    const paths: Array<{ params: { slug: string[] }; locale?: string }> = []

    // Generate paths for root pages only (Post/Home type)
    Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
      const page = pageInfo as types.PageInfo
      
      // Skip pages without required properties
      if (!pageId || !pageInfo.title || !pageInfo.type) {
        console.log(`[BUILD] Skipping page - missing required properties: pageId=${pageId}, title=${pageInfo.title}, type=${pageInfo.type}`)
        return
      }

      // Skip non-public pages
      if (pageInfo.public === false) {
        console.log(`[BUILD] Skipping private page: ${pageInfo.title}`)
        return
      }

      // Skip subpages - they are not in sitemap and handled dynamically
      if (pageInfo.parentPageId) {
        console.log(`[BUILD] Skipping subpage (not in sitemap): ${pageInfo.title}`)
        return
      }

      // Only generate paths for root pages (Post/Home type)
      if (page.type === 'Post' || page.type === 'Home') {
        console.log(`[BUILD] Generating path for root page: ${pageInfo.title} (${pageInfo.slug})`)
        siteConfig.locale.localeList.forEach((locale) => {
          if (page.language === locale) {
            paths.push({
              params: { slug: [page.slug] },
              locale,
            })
          }
        })
      } else {
        console.log(`[BUILD] Skipping non-Post/Home page: ${pageInfo.type}`)
      }
    })

    console.log(`[BUILD] Generated ${paths.length} post and home page paths`)

    return {
      paths,
      fallback: 'blocking',
    }
  } catch (err) {
    console.error('Error generating nested post paths:', err)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps<NestedPostPageProps, { slug: string[] }> = async (context) => {
  const { slug } = context.params!
  const locale = context.locale!

  try {
    const siteMap = await getCachedSiteMap()
    console.log(`[SSR] getStaticProps called with slug: ${slug.join('/')}`)
    console.log(`[SSR] Expected actual Notion page ID: 230f2d475c3180fa82b0f4de70b10b85`)

    // The slug array should be [parent-post-slug, ...subpage-title-ids]
    const parentPostSlug = slug[0]
    const subpageTitleIds = slug.slice(1)
    console.log(`[SSR] parentPostSlug: ${parentPostSlug}, subpageTitleIds: ${subpageTitleIds}`)

    // For root pages, find the parent post; for subpages, we'll extract page ID directly
    let parentPostPageId: string | null = null
    let parentPostPageInfo: types.PageInfo | null = null

    if (slug.length === 1) {
      // Only validate parent for root pages
      const parentPostSlug = slug[0]
      for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
        const page = pageInfo as types.PageInfo
        if (page.language === locale && page.slug === parentPostSlug && (page.type === 'Post' || page.type === 'Home')) {
          parentPostPageId = pageId
          parentPostPageInfo = page
          break
        }
      }
    }

    // Extract page ID from URL segments
    let currentPageId: string
    
    if (slug.length === 1) {
      // Root page: /post/{slug} - must exist in sitemap
      if (!parentPostPageId || !parentPostPageInfo) {
        console.log(`Parent post not found: locale=${locale}, slug=${slug[0]}`)
        return {
          notFound: true,
          revalidate: site.isr?.revalidate ?? 60,
        }
      }
      currentPageId = parentPostPageId
    } else {
      // Subpage: /post/{root-slug}/{...}/{title}-{pageId} - extract full UUID
      const lastSegment = slug.at(-1)
      
      // UUID format: 8-4-4-4-12 hex digits (36 chars total with hyphens)
      const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i
      const match = lastSegment?.match(uuidRegex)
      
      if (match) {
        currentPageId = match[1]
      } else {
        currentPageId = lastSegment || ''
      } 
      console.log(`[SSR] Using page ID directly: ${currentPageId}`)
    }

    // Fetch the page content
    console.log(`[SSR] Fetching page with pageId: ${currentPageId}`)
    const recordMap = await getPage(currentPageId)

    // Check if the page is private (if we have page info)
    const pageInfo = siteMap.pageInfoMap[currentPageId]
    if (pageInfo?.public === false) {
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    return {
      props: {
        ...(await serverSideTranslations(locale, ['common'], nextI18NextConfig)),
        site: siteMap.site,
        siteMap,
        pageId: currentPageId,
        recordMap,
        slugPath: slug,
      },
      revalidate: site.isr?.revalidate ?? 60,
    }
  } catch (err) {
    console.error('Error fetching nested post page:', err)
    return {
      notFound: true,
      revalidate: site.isr?.revalidate ?? 60,
    }
  }
}
