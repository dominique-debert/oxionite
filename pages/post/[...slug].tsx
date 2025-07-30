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

      // If this page belongs to a post or home page, generate nested path
      if (parentPost) {
        const buildNestedPath = (pageId: string): string[] => {
          const path: string[] = []
          let currentId: string | undefined = pageId
          
          while (currentId) {
            const currentPageInfo = siteMap.pageInfoMap[currentId] as types.PageInfo
            if (!currentPageInfo) break
            
            // Stop when we reach the parent post or home page
            if (currentPageInfo.type === 'Post' || currentPageInfo.type === 'Home') {
              break
            }
            
            path.unshift(currentPageInfo.slug)
            currentId = currentPageInfo.parentPageId || undefined
          }
          
          // Add the parent post slug at the beginning
          path.unshift(parentPost.slug)
          return path
        }

        const nestedPath = buildNestedPath(pageId)
        
        // Add paths for each locale
        const locales: ('ko' | 'en')[] = ['ko', 'en']
        locales.forEach((locale: 'ko' | 'en') => {
          if (page.language === locale) {
            paths.push({
              params: { slug: nestedPath },
              locale,
            })
          }
        })
      }
    })

    console.log(`Generated ${paths.length} post and home page paths`)

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

    // The slug array should be [parent-post-slug, ...subpage-slugs]
    const parentPostSlug = slug[0]
    const subpageSlugs = slug.slice(1)

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

    // Navigate through the subpage hierarchy
    let currentPageId = parentPostPageId
    let currentPageInfo = parentPostPageInfo

    for (const subpageSlug of subpageSlugs) {
      let foundChild = false
      
      // Find child page with matching slug
      for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
        const page = pageInfo as types.PageInfo
        if (page.parentPageId === currentPageId && 
            page.language === locale && 
            page.slug === subpageSlug) {
          currentPageId = pageId
          currentPageInfo = page
          foundChild = true
          break
        }
      }

      if (!foundChild) {
        console.log(`Subpage not found: locale=${locale}, parent=${currentPageId}, slug=${subpageSlug}`)
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
