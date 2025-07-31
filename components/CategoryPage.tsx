import { useRouter } from 'next/router'
import * as React from 'react'

import { PostList } from '@/components/PostList'
import type * as types from '@/lib/context/types'
import { useI18n } from '@/lib/i18n'
import { useDarkMode } from '@/lib/use-dark-mode'

interface CategoryPageProps {
  pageProps: types.PageProps
}

interface PostItem {
  pageId: string
  title: string
  description: string | null
  date: string | null
  slug: string
  language: string
  coverImage?: string
  coverImageBlock?: types.Block // Add block for mapImageUrl
}

const _POSTS_PER_PAGE = 5

// Utility function to get all posts from a category recursively (same logic as CategoryTree)
const getAllPostsFromCategory = (categoryPageInfo: types.PageInfo): PostItem[] => {
  const posts: PostItem[] = []
  
  const collectPosts = (pageInfo: types.PageInfo) => {
    // If this is a post, add it to the list
    if (pageInfo.type === 'Post') {
      posts.push({
        pageId: pageInfo.pageId,
        title: pageInfo.title,
        description: pageInfo.description,
        date: (pageInfo as any).date, // Fix: Property 'published' does not exist on type 'PageInfo'
        slug: pageInfo.slug,
        language: pageInfo.language || 'ko',
        coverImage: pageInfo.coverImage || undefined,
        coverImageBlock: pageInfo.coverImageBlock || undefined // Pass the block
      })
    }
    
    // Recursively collect posts from children
    if (pageInfo.children && pageInfo.children.length > 0) {
      for (const child of pageInfo.children) {
        collectPosts(child)
      }
    }
  }
  
  // Start collecting from the category (same as CategoryTree countPostsRecursively)
  collectPosts(categoryPageInfo)
  
  return posts
}



export function CategoryPage({ pageProps }: CategoryPageProps) {
  const { siteMap, pageId } = pageProps
  const router = useRouter()
  const { isDarkMode: _isDarkMode } = useDarkMode()

  // Get texts for current locale
  const locale = router.locale || 'ko'
  const t = useI18n(locale)
  
  // Get current page info from navigationTree (same as CategoryTree uses)
  const currentPageInfo = React.useMemo(() => {
    if (!siteMap || !pageId || !siteMap.navigationTree) return null
    
    // Find the page in navigationTree (same logic as CategoryTree)
    const findInNavigationTree = (items: types.PageInfo[], targetPageId: string): types.PageInfo | null => {
      for (const item of items) {
        if (item.pageId === targetPageId) {
          return item
        }
        if (item.children) {
          const found = findInNavigationTree(item.children, targetPageId)
          if (found) return found
        }
      }
      return null
    }
    
    return findInNavigationTree(siteMap.navigationTree, pageId)
  }, [siteMap, pageId])
  
  // Get all posts from this category
  const allPosts = React.useMemo(() => {
    if (!currentPageInfo) return []
    
    console.log('CategoryPage - Current page info:', currentPageInfo.title, 'Children count:', currentPageInfo.children?.length || 0)
    
    const posts = getAllPostsFromCategory(currentPageInfo)
    console.log('CategoryPage - Collected posts count:', posts.length)
    
    // Filter posts by current locale
    const filteredPosts = posts.filter(post => post.language === locale)
    console.log('CategoryPage - Filtered posts count:', filteredPosts.length)
    
    // Sort by published date (newest first)
    return filteredPosts.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [currentPageInfo, locale])
  


  // Format posts for PostList component
  const formattedPosts = React.useMemo(() => {
    return allPosts.map((post) => ({
      pageId: post.pageId,
      title: post.title,
      description: post.description,
      date: post.date,
      slug: post.slug,
      language: post.language,
      coverImage: post.coverImage,
      coverImageBlock: post.coverImageBlock,
    }))
  }, [allPosts])

  if (!currentPageInfo) {
    return <div>Category not found</div>
  }

  return (
    <PostList
      posts={formattedPosts}
      title={currentPageInfo.title}
      description={t.totalPostsCount(formattedPosts.length)}
      emptyMessage={t.noPosts}
      emptyDescription={t.noPostsDescription}
    />
  )
}