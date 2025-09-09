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

    console.log('=== getStaticPaths Debug ===')
    console.log('Full databaseInfoMap:', JSON.stringify(siteMap.databaseInfoMap, null, 2))

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

    // Generate paths for all database pages using databaseInfoMap
    const databaseInfoMap = siteMap.databaseInfoMap || {}
    console.log('Database keys found:', Object.keys(databaseInfoMap))
    
    Object.keys(databaseInfoMap).forEach((dbKey) => {
      const dbInfo = databaseInfoMap[dbKey]
      console.log(`Processing dbKey: ${dbKey}`, {
         dbInfo: dbInfo,
         hasSlug: dbInfo?.slug,
         name: dbInfo?.name,
         coverImage: dbInfo?.coverImage
       })
      
      if (dbInfo && dbInfo.slug) {
        // Extract locale from dbKey (format: dbId_locale or dbId_default)
        const locale = dbKey.split('_').pop() || 'default'
        const actualLocale = locale === 'default' ? siteConfig.locale.defaultLocale : locale
        
        console.log(`Adding DB path: ${dbInfo.slug} for locale ${actualLocale}`)
        
        // Avoid duplicates if a category has the same slug as a DB
        if (!categoryPages.some(p => p.slug === dbInfo.slug && p.language === actualLocale)) {
          paths.push({
            params: { slug: dbInfo.slug },
            locale: actualLocale
          })
        }
      }
    })

    console.log('Total paths generated:', paths.length)
    console.log('Paths:', paths)

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

  console.log('=== getStaticProps Debug ===')
  console.log('Requested slug:', slug)
  console.log('Requested locale:', locale)

  try {
    const siteMap = await getCachedSiteMap()
    const databaseInfoMap = siteMap.databaseInfoMap || {}

    console.log('Available database keys:', Object.keys(databaseInfoMap))
    console.log('Full databaseInfoMap:', JSON.stringify(databaseInfoMap, null, 2))

    // 1. Find database by matching slug and locale from databaseInfoMap
    let targetDbKey: string | null = null
    let targetDbInfo: any = null

    console.log('Searching for slug:', slug, 'in locale:', locale)

    // First, try to find exact locale match
    Object.keys(databaseInfoMap).forEach((dbKey) => {
      const dbInfo = databaseInfoMap[dbKey]
      console.log(`Checking dbKey: ${dbKey}`, {
        dbInfo,
        slugMatch: dbInfo?.slug === slug,
        dbLocale: dbKey.split('_').pop(),
        actualLocale: dbKey.split('_').pop() === 'default' ? siteConfig.locale.defaultLocale : dbKey.split('_').pop()
      })
      
      if (dbInfo && dbInfo.slug === slug) {
        const dbLocale = dbKey.split('_').pop() || 'default'
        const actualLocale = dbLocale === 'default' ? siteConfig.locale.defaultLocale : dbLocale
        console.log(`Found slug match: ${dbInfo.slug}, dbLocale: ${dbLocale}, actualLocale: ${actualLocale}, requested: ${locale}`)
        if (actualLocale === locale) {
          targetDbKey = dbKey
          targetDbInfo = dbInfo
          console.log('Exact locale match found:', dbKey)
        }
      }
    })

    // If no exact match found, try default locale
    if (!targetDbKey) {
      console.log('No exact locale match, trying default locale fallback...')
      Object.keys(databaseInfoMap).forEach((dbKey) => {
        const dbInfo = databaseInfoMap[dbKey]
        if (dbInfo && dbInfo.slug === slug) {
          const dbLocale = dbKey.split('_').pop() || 'default'
          console.log(`Checking default fallback: ${dbKey}, locale: ${dbLocale}`)
          if (dbLocale === 'default') {
            targetDbKey = dbKey
            targetDbInfo = dbInfo
            console.log('Default locale match found:', dbKey)
          }
        }
      })
    }

    console.log('Final match result:', {
         targetDbKey,
         targetDbInfo,
         name: targetDbInfo?.name
       })

    if (targetDbKey && targetDbInfo) {
      const dbId = String(targetDbKey).split('_')[0] // Extract actual database ID
      const dbChildren = Object.values(siteMap.pageInfoMap).filter(
        (p) => p.parentDbId === dbId && p.language === locale
      )

      console.log('Database children found:', dbChildren.length, 'for dbId:', dbId)

      const dbPageInfo: types.PageInfo = {
        title: targetDbInfo.name || 'Untitled',
        pageId: dbId,
        type: 'Category',
        slug: targetDbInfo.slug,
        parentPageId: null,
        childrenPageIds: dbChildren.map(child => child.pageId),
        language: locale,
        public: true,
        useOriginalCoverImage: false,
        description: null,
        date: null,
        coverImage: targetDbInfo.coverImage || null,
        coverImageBlock: null,
        tags: [],
        authors: [],
        breadcrumb: [],
        children: dbChildren,
        canonicalPageUrl: `/category/${targetDbInfo.slug}`
      };

      console.log('Final dbPageInfo:', dbPageInfo)

      return {
        props: {
          ...(await serverSideTranslations(locale, ['common', 'languages'], nextI18NextConfig)),
          site: siteMap.site,
          siteMap,
          pageId: dbId,
          isDbPage: true,
          dbPageInfo,
        },
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    console.log('No database found for slug:', slug, 'and locale:', locale)

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

