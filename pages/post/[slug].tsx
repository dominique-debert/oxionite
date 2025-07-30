import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'

import { NotionPage } from '@/components/NotionPage'
import type * as types from '@/lib/types'
import { getCachedSiteMap } from '@/lib/site-cache'
import { getPage } from '@/lib/notion'
import { site } from '@/lib/config'

export interface PostPageProps {
  site: types.Site
  siteMap: types.SiteMap
  pageId: string
  recordMap?: types.ExtendedRecordMap
  isPrivate?: boolean
}

export default function PostSlugPage({ site, siteMap, pageId, recordMap, isPrivate }: PostPageProps) {
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
    const paths: Array<{ params: { slug: string }; locale?: string }> = []

    // Generate paths for all post pages
    Object.values(siteMap.pageInfoMap).forEach((pageInfo) => {
      const page = pageInfo as types.PageInfo
      if (page.type === 'Post') {
        // Add paths for each locale
        ['ko', 'en'].forEach((locale) => {
          if (page.language === locale) {
            paths.push({
              params: { slug: page.slug },
              locale,
            })
          }
        })
      }
    })

    console.log(`Generated ${paths.length} post paths`)

    return {
      paths,
      fallback: 'blocking',
    }
  } catch (err) {
    console.error('Error generating post paths:', err)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps<PostPageProps, { slug: string }> = async (context) => {
  const { slug } = context.params!
  const locale = context.locale || 'ko'

  try {
    const siteMap = await getCachedSiteMap()

    // Find the post page by slug and locale
    let postPageId: string | null = null
    let postPageInfo: types.PageInfo | null = null

    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      const page = pageInfo as types.PageInfo
      if (page.language === locale && page.slug === slug && page.type === 'Post') {
        postPageId = pageId
        postPageInfo = page
        break
      }
    }

    if (!postPageId || !postPageInfo) {
      console.log(`Post not found: locale=${locale}, slug=${slug}`)
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // Check if the page is private
    if (postPageInfo.public === false) {
      return {
        props: {
          site: siteMap.site,
          siteMap,
          pageId: postPageId,
          isPrivate: true,
        },
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // Fetch the page content
    const recordMap = await getPage(postPageId)

    return {
      props: {
        site: siteMap.site,
        siteMap,
        pageId: postPageId,
        recordMap,
      },
      revalidate: site.isr?.revalidate ?? 60,
    }
  } catch (err) {
    console.error('Error fetching post page:', err)
    return {
      notFound: true,
      revalidate: site.isr?.revalidate ?? 60,
    }
  }
}
