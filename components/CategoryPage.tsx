import Link from 'next/link'
import { useRouter } from 'next/router'
import * as React from 'react'

import type * as types from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { mapImageUrl } from '@/lib/map-image-url'
import { useDarkMode } from '@/lib/use-dark-mode'

interface CategoryPageProps {
  pageProps: types.PageProps
}

interface PostItem {
  pageId: string
  title: string
  description: string | null
  published: string | null
  slug: string
  language: string
  coverImage?: string
  coverImageBlock?: types.Block // Add block for mapImageUrl
}

const POSTS_PER_PAGE = 20

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
        published: (pageInfo as any).published, // Fix: Property 'published' does not exist on type 'PageInfo'
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

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  try {
    // Handles both 'YYYY-MM-DD' and 'Month DD, YYYY' formats
    const date = new Date(dateString)
    // Check if the date is valid
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  } catch (err) {
    console.error(`Invalid date string: ${dateString}`, err)
    return dateString // Return original string on error
  }
}

export function CategoryPage({ pageProps }: CategoryPageProps) {
  const { siteMap, pageId, isMobile = false } = pageProps
  const router = useRouter()
  const [currentPage, setCurrentPage] = React.useState(1)
  const { isDarkMode } = useDarkMode()

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
    
    // Sort by published date (newest first)
    return posts.sort((a, b) => {
      if (!a.published && !b.published) return 0
      if (!a.published) return 1
      if (!b.published) return -1
      return new Date(b.published).getTime() - new Date(a.published).getTime()
    })
  }, [currentPageInfo])
  
  // Pagination calculations
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const endIndex = startIndex + POSTS_PER_PAGE
  const currentPosts = allPosts.slice(startIndex, endIndex)
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const siblingCount = 2; // Number of pages on each side of the current page, creating a block of 5
    const totalPageNumbers = siblingCount + 5; // A threshold to decide when to use ellipsis

    // If total pages are less than the threshold, show all page numbers
    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPages
    );

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + 1 + i);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }
    
    // Default case: show all pages (shouldn't be reached often with the logic above)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  if (!currentPageInfo) {
    return <div>Category not found</div>
  }

  // Define styles for glassmorphism effect on post cards
  const cardStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    borderRadius: '16px',
    border: '1px solid',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    backgroundColor: isDarkMode ? 'rgba(40, 40, 40, 0.5)' : 'rgba(255, 255, 255, 0.4)',
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  }

  const cardHoverStyle: React.CSSProperties = {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {/* Category Header */}
      <div style={{
        marginBottom: '3rem',
        borderBottom: '1px solid var(--secondary-bg-color)',
        paddingBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: 'var(--primary-text-color)',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          {currentPageInfo.title}
        </h1>
        {currentPageInfo.description && (
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--secondary-text-color)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            {currentPageInfo.description}
          </p>
        )}
        <div style={{
          fontSize: '0.9rem',
          color: 'var(--secondary-text-color)'
        }}>
          {t.totalPostsCount(allPosts.length)}
        </div>
      </div>
      
      {/* Posts List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '2.5rem'
      }}>
        {currentPosts.map((post) => (
          <Link
            key={post.pageId}
            href={`/${post.language}/${post.slug}`}
            style={cardStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, cardHoverStyle)
            }}
            onMouseLeave={(e) => {
              // Reset to base styles defined in `cardStyle`
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
            }}
          >
            <article style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              width: '100%',
              minHeight: isMobile ? 'auto' : '140px',
              overflow: 'hidden',
              borderRadius: '16px' // Match parent Link's rounding
            }}
            >
              {/* Cover Image - 모바일에서는 위에, 데스크톱에서는 오른쪽 */}
              {post.coverImage && post.coverImageBlock && (
                <div style={{
                  width: isMobile ? '100%' : '260px',
                  height: isMobile ? '200px' : 'auto',
                  order: isMobile ? 1 : 2,
                  alignSelf: isMobile ? 'stretch' : 'stretch',
                  backgroundColor: 'var(--bg-color-1)',
                  flexShrink: 0,
                  backgroundImage: `url('${mapImageUrl(post.coverImage, post.coverImageBlock)}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: isMobile ? '16px 16px 0 0' : '0 16px 16px 0'
                }} />
              )}

              {/* Content */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                order: isMobile ? 2 : 1,
                padding: isMobile ? '1.5rem 1rem' : '1.5rem 2rem',
                minWidth: 0 // flex item이 수축할 때 내용이 넘치는 것을 방지
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: 'var(--primary-text-color)',
                    margin: '0',
                    lineHeight: '1.4'
                  }}>
                    {post.title}
                  </h2>
                  {post.description && (
                    <p style={{
                      fontSize: '0.95rem',
                      color: 'var(--secondary-text-color)',
                      lineHeight: '1.5',
                      marginTop: '0.5rem',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {post.description}
                    </p>
                  )}
                </div>
                {post.published && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--tertiary-text-color)',
                    fontWeight: '500'
                  }}>
                    {formatDate(post.published)}
                  </div>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '4rem',
          marginBottom: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(55, 53, 47, 0.16)'
        }}>
          {/* Page Numbers */}
          {getPageNumbers().map((pageNum, index) =>
            typeof pageNum === 'string' ? (
              <span key={`ellipsis-${index}`} style={{ padding: '0 0.25rem', color: 'var(--tertiary-text-color)' }}>
                {pageNum}
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid',
                  borderColor: pageNum === currentPage ? 'var(--primary-highlight-color)' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0,0,0,0.2)'),
                  borderRadius: '9999px',
                  backgroundColor: pageNum === currentPage ? 'var(--primary-highlight-color)' : 'transparent',
                  color: pageNum === currentPage ? '#FFFFFF' : 'var(--secondary-text-color)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: pageNum === currentPage ? '600' : '400',
                  transition: 'all 0.2s ease',
                  minWidth: '40px',
                  lineHeight: '1'
                }}
                onMouseEnter={(e) => {
                  if (pageNum !== currentPage) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (pageNum !== currentPage) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                {pageNum}
              </button>
            )
          )}
        </div>
      )}
      
      {/* No Posts Message */}
      {allPosts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--secondary-text-color)',
          minHeight: '30vh', // Set a minimum height
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <React.Fragment>
            <div style={{
              fontSize: '1.1rem',
              marginBottom: '0.5rem',
              width: '100%'
            }}>
              {t.noPosts}
            </div>
            <div style={{
              fontSize: '0.9rem'
            }}>
              {t.noPostsDescription}
            </div>
          </React.Fragment>
        </div>
      )}
    </div>
  )
} 