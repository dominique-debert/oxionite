import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'

import { CategoryPage } from '@/components/CategoryPage'
import type * as types from '@/lib/types'
import { getCachedSiteMap } from '@/lib/site-cache'

import { site } from '@/lib/config'

export interface CategoryPageProps {
  site: types.Site
  siteMap: types.SiteMap
  pageId: string
  isPrivate?: boolean
}

export default function CategorySlugPage({ site, siteMap, pageId, isPrivate }: CategoryPageProps) {
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
  }

  return <CategoryPage pageProps={pageProps} />
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const siteMap = await getCachedSiteMap()
    const paths: Array<{ params: { slug: string }; locale?: string }> = []

    // Generate paths for all category pages
    Object.values(siteMap.pageInfoMap).forEach((pageInfo) => {
      const page = pageInfo as types.PageInfo
      if (page.type === 'Category') {
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

    console.log(`Generated ${paths.length} category paths`)

    return {
      paths,
      fallback: 'blocking',
    }
  } catch (err) {
    console.error('Error generating category paths:', err)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps<CategoryPageProps, { slug: string }> = async (context) => {
  const { slug } = context.params!
  const locale = context.locale || 'ko'

  try {
    const siteMap = await getCachedSiteMap()

    // Find the category page by slug and locale
    let categoryPageId: string | null = null
    let categoryPageInfo: types.PageInfo | null = null

    for (const [pageId, pageInfo] of Object.entries(siteMap.pageInfoMap)) {
      const page = pageInfo as types.PageInfo
      if (page.language === locale && page.slug === slug && page.type === 'Category') {
        categoryPageId = pageId
        categoryPageInfo = page
        break
      }
    }

    if (!categoryPageId || !categoryPageInfo) {
      console.log(`Category not found: locale=${locale}, slug=${slug}`)
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // Check if the page is private
    if (categoryPageInfo.public === false) {
      return {
        props: {
          site: siteMap.site,
          siteMap,
          pageId: categoryPageId,
          isPrivate: true,
        },
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    return {
      props: {
        site: siteMap.site,
        siteMap,
        pageId: categoryPageId,
      },
      revalidate: site.isr?.revalidate ?? 60,
    }
  } catch (err) {
    console.error('Error fetching category page:', err)
    return {
      notFound: true,
      revalidate: site.isr?.revalidate ?? 60,
    }
  }
}
