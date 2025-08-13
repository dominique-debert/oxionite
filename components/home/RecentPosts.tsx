import React from 'react'
import { PostList } from '@/components/PostList'

import type { SiteMap } from '@/lib/context/types'

interface RecentPostsProps {
  siteMap?: SiteMap
}

export default function RecentPosts({ siteMap, isMobile }: RecentPostsProps & { isMobile?: boolean }) {
  const recentPosts = React.useMemo(() => {
    if (!siteMap) return []
    return Object.values(siteMap.pageInfoMap)
      .filter((page) => page.type === 'Post')
      .map((page) => ({
        pageId: page.pageId,
        title: page.title,
        description: page.description,
        date: page.date,
        slug: page.slug,
        language: page.language || 'en',
        coverImage: page.coverImage || undefined,
        coverImageBlock: page.coverImageBlock,
      }))
  }, [siteMap])

  return (
    <PostList
      posts={recentPosts}
      postsPerPage={6}
      emptyMessage="No recent posts found."
      emptyDescription="Check back later for new content."
      isMobile={isMobile}
    />
  )
}