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

    // Filter posts by tag (case-insensitive)
    return allPosts.filter((post) => {
      // For now, we'll check if the tag appears in title, description, or we'll need to add tags property
      // In a real implementation, you'd want to add a 'Tags' property to your Notion database
      const searchText = `${post.title} ${post.description || ''}`.toLowerCase()
      return searchText.includes(tag.toLowerCase())
    })
  }, [siteMap?.pageInfoMap, tag])

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
      description={`${t.postsTaggedWith} "${tag}"`}
      emptyMessage={t.noPostsFound}
      emptyDescription={`${t.noPostsWithTag} "${tag}"`}
    />
  )
}
