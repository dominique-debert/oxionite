import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { TagPage } from '@/components/TagPage'
import type * as types from '@/lib/context/types'
import { getCachedSiteMap } from '@/lib/context/site-cache'
import { site } from '@/lib/config'
import { siteConfig } from '../../site.config'

export interface TagPageProps {
  site: types.Site
  siteMap: types.SiteMap
  tag: string
}

export default function TagSlugPage({ site, siteMap, tag }: TagPageProps) {
  const pageProps: types.PageProps = {
    site,
    siteMap,
    pageId: `tag-${tag}`,
  }

  return <TagPage pageProps={pageProps} tag={tag} />
}

export const getStaticPaths: GetStaticPaths = async (): Promise<any> => {
  try {
    const siteMap = await getCachedSiteMap()
    const paths: Array<{ params: { tag: string }; locale: string }> = []

    const tags = new Set<string>()
    Object.values(siteMap.pageInfoMap).forEach((pageInfo) => {
      const page = pageInfo as types.PageInfo
      if (page.type === 'Post' && page.tags) {
        page.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tags.add(tag.trim())
          }
        })
      }
    })

    tags.forEach((tag: string) => {
      siteConfig.locale.localeList.forEach((locale: string) => {
        if (tag && tag.trim()) {
          paths.push({
            params: { tag },
            locale,
          })
        }
      })
    })

    return {
      paths,
      fallback: 'blocking',
    }
  } catch (err) {
    console.error('Error generating tag paths:', err)
    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export const getStaticProps: GetStaticProps<TagPageProps, { tag: string }> = async (context) => {
  const { tag } = context.params!
  const locale = context.locale!

  try {
    const siteMap = await getCachedSiteMap()

    // Allow UTF-8 characters in tags
    const decodedTag = decodeURIComponent(tag)
    
    return {
      props: {
        ...(await serverSideTranslations(locale, ['common'])),
        site: siteMap.site,
        siteMap,
        tag: decodedTag,
      },
      revalidate: site.isr?.revalidate ?? 60,
    }
  } catch (err) {
    console.error('Error fetching tag page:', err)
    return {
      notFound: true,
      revalidate: site.isr?.revalidate ?? 60,
    }
  }
}
