import * as React from 'react'
import { useRouter } from 'next/router'

import { PostList } from '@/components/PostList'
import type * as types from '@/lib/types'
import { useI18n } from '@/lib/i18n'

export interface TagPageProps {
  pageProps: types.PageProps
  tag: string
}

export function TagPage({ pageProps, tag }: TagPageProps) {
  const { siteMap } = pageProps
  const router = useRouter()
  const locale = router.locale || 'ko'
  const t = useI18n(locale)

  // Get all posts that have this tag
  const postsWithTag = React.useMemo(() => {
    if (!siteMap?.pageInfoMap) return []

    const allPosts = Object.values(siteMap.pageInfoMap).filter(
      (page) => page.type === 'Post' && page.public === true
    )

    // Filter posts by tag and current locale
    return allPosts.filter((post) => {
      // Check if the post has the specific tag
      const hasTag = post.tags?.some((postTag: string) => 
        postTag.toLowerCase() === tag.toLowerCase()
      ) || false
      
      // Also filter by current locale to prevent showing posts from all languages
      const postLanguage = post.language || 'ko'
      
      return hasTag && postLanguage === locale
    })
  }, [siteMap?.pageInfoMap, tag, locale])

  // Format posts for PostList component
  const formattedPosts = React.useMemo(() => {
    return postsWithTag.map((post) => ({
      pageId: post.pageId,
      title: post.title,
      description: post.description,
      date: post.date,
      slug: post.slug,
      language: post.language || 'ko',
      coverImage: post.coverImage || undefined,
      coverImageBlock: post.coverImageBlock || undefined,
    }))
  }, [postsWithTag])

  return (
    <PostList
      posts={formattedPosts}
      title={`#${tag}`}
      description={t.postsTaggedWithCount(postsWithTag.length)}
      emptyMessage={t.noPostsFound}
      emptyDescription={`${t.noPostsWithTag} "${tag}"`}
    />
  )
}
