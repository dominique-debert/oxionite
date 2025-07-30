import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'

import { NotionPage } from '@/components/NotionPage'
import type * as types from '@/lib/types'
import { getCachedSiteMap } from '@/lib/site-cache'
import { getPage } from '@/lib/notion'
import { site } from '@/lib/config'

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

    // Generate paths for all posts, home pages, and their subpages
    Object.entries(siteMap.pageInfoMap).forEach(([pageId, pageInfo]) => {
      const page = pageInfo as types.PageInfo
      
      // Include posts and home pages themselves
      if (page.type === 'Post' || page.type === 'Home') {
        const locales: ('ko' | 'en')[] = ['ko', 'en']
        locales.forEach((locale: 'ko' | 'en') => {
          if (page.language === locale) {
            paths.push({
              params: { slug: [page.slug] },
              locale,
            })
          }
        })
        return
      }

      // Handle subpages that belong to posts or home pages
      let parentPost: types.PageInfo | null = null
      let currentParentId = page.parentPageId
      
      while (currentParentId) {
        const parentPageInfo = siteMap.pageInfoMap[currentParentId] as types.PageInfo
        if (!parentPageInfo) break
        
        if (parentPageInfo.type === 'Post' || parentPageInfo.type === 'Home') {
          parentPost = parentPageInfo
          break
        }
        
        currentParentId = parentPageInfo.parentPageId
      }

      // Generate the correct path based on page type
      if (parentPost) {
        // Subpage: /post/{root-slug}/{subpage-id}
        console.log(`[BUILD] Generating path for subpage - pageId: ${pageId}, rootSlug: ${parentPost.slug}, actual Notion URL: https://www.notion.so/alemem64/Page-1-${pageId.replace(/-/g, '')}`)
        const locales: ('ko' | 'en')[] = ['ko', 'en']
        locales.forEach((locale: 'ko' | 'en') => {
          if (page.language === locale) {
            paths.push({
              params: {
                slug: [parentPost.slug, pageId]
              },
              locale,
            })
            console.log(`[BUILD] Generated path: /post/${parentPost.slug}/${pageId}`)
          }
        })
      } else {
        // Root pages (Post/Home): /post/{slug}
        const locales: ('ko' | 'en')[] = ['ko', 'en']
        locales.forEach((locale: 'ko' | 'en') => {
          if (page.language === locale) {
            paths.push({
              params: {
                slug: [pageInfo.slug]
              },
              locale,
            })
          }
        })
      }
    })

    console.log(`[BUILD] Generated ${paths.length} post and home page paths`)
    paths.forEach(path => console.log(`[BUILD] Path: /post/${path.params.slug.join('/')}`))

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
  const locale = context.locale || 'ko'

  try {
    const siteMap = await getCachedSiteMap()
    console.log(`[SSR] getStaticProps called with slug: ${slug.join('/')}`)
    console.log(`[SSR] Expected actual Notion page ID: 230f2d475c3180fa82b0f4de70b10b85`)

    // The slug array should be [parent-post-slug, ...subpage-title-ids]
    const parentPostSlug = slug[0]
    const subpageTitleIds = slug.slice(1)
    console.log(`[SSR] parentPostSlug: ${parentPostSlug}, subpageTitleIds: ${subpageTitleIds}`)

    // Find the parent post
    let parentPostPageId: string | null = null
    let parentPostPageInfo: types.PageInfo | null = null

    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      const page = pageInfo as types.PageInfo
      if (page.language === locale && page.slug === parentPostSlug && (page.type === 'Post' || page.type === 'Home')) {
        parentPostPageId = pageId
        parentPostPageInfo = page
        break
      }
    }

    if (!parentPostPageId || !parentPostPageInfo) {
      console.log(`Parent post not found: locale=${locale}, slug=${parentPostSlug}`)
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // For subpages, we need to handle title-id format
    let currentPageId = parentPostPageId
    let currentPageInfo = parentPostPageInfo

    for (const subpageTitleId of subpageTitleIds) {
      let foundChild = false
      
      // Use the actual Notion page ID directly
      // The URL format should be: /post/{root-slug}/{actual-notion-page-id}
      const pageIdFromUrl = subpageTitleIds[0]
      console.log(`[SSR] pageIdFromUrl: ${pageIdFromUrl}`)
      
      // For subpages, we accept any valid Notion page ID
      // We don't require PageInfo entries for subpages
      if (pageIdFromUrl) {
        currentPageId = pageIdFromUrl
        foundChild = true
        break
      }

      if (!foundChild) {
        console.log(`Subpage not found: locale=${locale}, parent=${currentPageId}, titleId=${subpageTitleId}`)
        return {
          notFound: true,
          revalidate: site.isr?.revalidate ?? 60,
        }
      }
    }

    // Check if the page is private
    if (currentPageInfo.public === false) {
      return {
        props: {
          site: siteMap.site,
          siteMap,
          pageId: currentPageId,
          isPrivate: true,
          slugPath: slug,
        },
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // Fetch the page content
    console.log(`[SSR] Fetching page with currentPageId: ${currentPageId}`)
    const recordMap = await getPage(currentPageId)

    return {
      props: {
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
