import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../../next-i18next.config.cjs'

import { CategoryPage } from '@/components/CategoryPage'
import type * as types from '@/lib/context/types'
import { getCachedSiteMap } from '@/lib/context/site-cache'
import siteConfig from '../../site.config'

import { site } from '@/lib/config'

export interface CategoryPageProps {
  site: types.Site
  siteMap: types.SiteMap
  pageId: string
  isPrivate?: boolean
  isDbPage?: boolean
  dbPageInfo?: types.PageInfo
}

export default function CategorySlugPage({ site, siteMap, pageId, isPrivate, isDbPage, dbPageInfo, isMobile }: CategoryPageProps & { isMobile?: boolean }) {
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

  return <CategoryPage pageProps={pageProps} isMobile={isMobile} isDbPage={isDbPage} dbPageInfo={dbPageInfo} />
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const siteMap = await getCachedSiteMap()
    const paths: Array<{ params: { slug: string }; locale?: string }> = []

    const allPages = Object.values(siteMap.pageInfoMap) as types.PageInfo[]
    const categoryPages = allPages.filter((page) => page.type === 'Category')

    // Generate paths for all category pages
    categoryPages.forEach((page) => {
      siteConfig.locale.localeList.forEach((locale) => {
        if (page.language === locale) {
          paths.push({
            params: { slug: page.slug },
            locale
          })
        }
      })
    })

    // Generate paths for all database pages
    const notionDbList = siteConfig.NotionDbList || []
    notionDbList.forEach((db) => {
      if (db.slug) {
        siteConfig.locale.localeList.forEach((locale) => {
          // Avoid duplicates if a category has the same slug as a DB
          if (!categoryPages.some(p => p.slug === db.slug && p.language === locale)) {
            paths.push({
              params: { slug: db.slug },
              locale
            })
          }
        })
      }
    })

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
  const locale = context.locale!

  try {
    const siteMap = await getCachedSiteMap()
    const notionDbList = siteConfig.NotionDbList || []

    // 1. Check if the slug matches a database slug
    const db = notionDbList.find((db) => db.slug === slug)

    if (db) {
      const dbChildren = Object.values(siteMap.pageInfoMap).filter(
        (p) => p.parentDbId === db.id && p.language === locale
      )

      const dbPageInfo: types.PageInfo = {
        title: db.name?.[locale] || db.name?.en || 'Untitled',
        pageId: db.id,
        type: 'Category',
        slug: db.slug,
        parentPageId: null,
        childrenPageIds: dbChildren.map(child => child.pageId),
        language: locale,
        public: true,
        useOriginalCoverImage: false,
        description: null,
        date: null,
        coverImage: null,
        coverImageBlock: null,
        tags: [],
        authors: [],
        breadcrumb: [],
        children: dbChildren,
        canonicalPageUrl: `/category/${db.slug}`
      };

      return {
        props: {
          ...(await serverSideTranslations(locale, ['common', 'languages'], nextI18NextConfig)),
          site: siteMap.site,
          siteMap,
          pageId: db.id, // Use db.id as pageId
          isDbPage: true, // Flag to indicate this is a DB page
          dbPageInfo: dbPageInfo,
        },
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // 2. If not a DB slug, find the category page by slug and locale
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
    
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    // Check if the page is private
    if (categoryPageInfo.public === false) {
      return {
        props: {
          ...(await serverSideTranslations(locale, ['common', 'languages'], nextI18NextConfig)),
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
        ...(await serverSideTranslations(locale, ['common', 'languages'], nextI18NextConfig)),
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

