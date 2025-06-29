import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import * as types from '@/lib/types'
import { mapImageUrl } from '@/lib/map-image-url'
import { useI18n } from '@/lib/i18n'

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
        published: pageInfo.published,
        slug: pageInfo.slug,
        language: pageInfo.language || 'ko'
      })
    }
    
    // Recursively collect posts from children
    if (pageInfo.children && pageInfo.children.length > 0) {
      pageInfo.children.forEach(child => {
        collectPosts(child)
      })
    }
  }
  
  // Start collecting from the category (same as CategoryTree countPostsRecursively)
  collectPosts(categoryPageInfo)
  
  return posts
}

// Utility function to get cover image from recordMap
const getCoverImageUrl = async (pageId: string): Promise<string | null> => {
  try {
    // This would need to be implemented to fetch cover image from Notion
    // For now, return null - we'll implement this properly later
    return null
  } catch (error) {
    console.error('Error fetching cover image:', error)
    return null
  }
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ pageProps }) => {
  const { siteMap, pageId } = pageProps
  const router = useRouter()
  const [currentPage, setCurrentPage] = React.useState(1)
  
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
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}.${month}.${day}`
    } catch (error) {
      return dateString
    }
  }
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  if (!currentPageInfo) {
    return <div>Category not found</div>
  }
  
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {/* Category Header */}
      <div style={{
        marginBottom: '3rem',
        borderBottom: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
        paddingBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: 'var(--fg-color)',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          {currentPageInfo.title}
        </h1>
        {currentPageInfo.description && (
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--fg-color-2)',
            lineHeight: '1.6',
            marginBottom: '1rem'
          }}>
            {currentPageInfo.description}
          </p>
        )}
        <div style={{
          fontSize: '0.9rem',
          color: 'var(--fg-color-2)'
        }}>
          {t.totalPostsCount(allPosts.length)}
        </div>
      </div>
      
      {/* Posts List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {currentPosts.map((post) => (
          <Link
            key={post.pageId}
            href={`/${post.language}/${post.slug}`}
            style={{
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <article style={{
              display: 'flex',
              gap: '1.5rem',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              width: 'clamp(600px, 90vw, 800px)' // 화면 너비의 90%, 최소 600px, 최대 800px
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = 'var(--fg-color-1, rgba(55, 53, 47, 0.3))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = 'var(--border-color, rgba(55, 53, 47, 0.16))'
            }}
            >
              {/* Content */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: 'var(--fg-color)',
                    marginBottom: '0.5rem',
                    lineHeight: '1.4'
                  }}>
                    {post.title}
                  </h2>
                  {post.description && (
                    <p style={{
                      fontSize: '0.95rem',
                      color: 'var(--fg-color-2)',
                      lineHeight: '1.5',
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
                    color: 'var(--fg-color-3)',
                    fontWeight: '500'
                  }}>
                    {formatDate(post.published)}
                  </div>
                )}
              </div>
              
              {/* Cover Image Placeholder */}
              <div style={{
                width: '160px',
                height: '120px', // 4:3 ratio
                borderRadius: '8px',
                backgroundColor: 'var(--bg-color-1)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--fg-color-3)',
                  textAlign: 'center'
                }}>
                  No Image
                </div>
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
          gap: '0.5rem',
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))'
        }}>
          {/* Previous Button */}
          {currentPage > 1 && (
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--fg-color-2)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
                e.currentTarget.style.borderColor = 'var(--fg-color-1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-color)'
                e.currentTarget.style.borderColor = 'var(--border-color, rgba(55, 53, 47, 0.16))'
              }}
            >
              {t.previousPage}
            </button>
          )}
          
          {/* Page Numbers */}
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
                borderRadius: '6px',
                backgroundColor: pageNum === currentPage ? 'var(--fg-color)' : 'var(--bg-color)',
                color: pageNum === currentPage ? 'var(--bg-color)' : 'var(--fg-color-2)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: pageNum === currentPage ? '600' : '400',
                transition: 'all 0.2s ease',
                minWidth: '36px'
              }}
              onMouseEnter={(e) => {
                if (pageNum !== currentPage) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
                  e.currentTarget.style.borderColor = 'var(--fg-color-1)'
                }
              }}
              onMouseLeave={(e) => {
                if (pageNum !== currentPage) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-color)'
                  e.currentTarget.style.borderColor = 'var(--border-color, rgba(55, 53, 47, 0.16))'
                }
              }}
            >
              {pageNum}
            </button>
          ))}
          
          {/* Next Button */}
          {currentPage < totalPages && (
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--fg-color-2)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
                e.currentTarget.style.borderColor = 'var(--fg-color-1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-color)'
                e.currentTarget.style.borderColor = 'var(--border-color, rgba(55, 53, 47, 0.16))'
              }}
            >
              {t.nextPage}
            </button>
          )}
        </div>
      )}
      
      {/* No Posts Message */}
      {allPosts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--fg-color-2)'
        }}>
          <div style={{
            fontSize: '1.1rem',
            marginBottom: '0.5rem'
          }}>
            {t.noPosts}
          </div>
          <div style={{
            fontSize: '0.9rem'
          }}>
            {t.noPostsDescription}
          </div>
        </div>
      )}
    </div>
  )
} 