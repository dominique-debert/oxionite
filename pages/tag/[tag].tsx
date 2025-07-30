import { GetStaticPaths, GetStaticProps } from 'next'
import * as React from 'react'

import { TagPage } from '@/components/TagPage'
import type * as types from '@/lib/types'
import { getCachedSiteMap } from '@/lib/site-cache'
import { site } from '@/lib/config'

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
      if (page.type === 'Post') {
        const tagPattern = /#(\w+)/g
        const titleMatches: string[] = page.title?.match(tagPattern) || []
        const descMatches: string[] = page.description?.match(tagPattern) || []
        
        titleMatches.concat(descMatches).forEach((match: string) => {
          const tag = match.slice(1)
          tags.add(tag)
        })
      }
    })

    tags.forEach((tag: string) => {
      ['ko', 'en'].forEach((locale: string) => {
        paths.push({
          params: { tag },
          locale,
        })
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
  

  try {
    const siteMap = await getCachedSiteMap()

    const safeTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (safeTag !== tag) {
      return {
        notFound: true,
        revalidate: site.isr?.revalidate ?? 60,
      }
    }

    return {
      props: {
        site: siteMap.site,
        siteMap,
        tag: safeTag,
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
