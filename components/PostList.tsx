import * as React from 'react'

import { PostCard } from '@/components/PostCard'
import type * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

export interface PostListProps {
  posts: Array<{
    pageId: string
    title: string
    description: string | null
    date: string | null
    slug: string
    language: string
    coverImage?: string
    coverImageBlock?: types.Block
  }>
  baseUrl?: string
  postsPerPage?: number
  title?: string
  description?: string
  emptyMessage?: string
  emptyDescription?: string
}

export function PostList({ 
  posts, 
  baseUrl = '', 
  postsPerPage = 5, 
  title,
  description,
  emptyMessage = 'No posts found',
  emptyDescription = 'There are no posts available at the moment.'
}: PostListProps) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const { isDarkMode } = useDarkMode()

  const totalPages = Math.ceil(posts.length / postsPerPage)
  const startIndex = (currentPage - 1) * postsPerPage
  const endIndex = startIndex + postsPerPage
  const currentPosts = posts.slice(startIndex, endIndex)

  const getPageNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      pageNumbers.push(1)
      
      if (currentPage > 3) {
        pageNumbers.push('...')
      }
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...')
      }
      
      pageNumbers.push(totalPages)
    }
    
    return pageNumbers
  }

  return (
    <div>
      {title && (
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            color: 'var(--primary-text-color)',
          }}>
            {title}
          </h1>
          {description && (
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--secondary-text-color)',
              margin: 0,
            }}>
              {description}
            </p>
          )}
        </div>
      )}

      {currentPosts.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {currentPosts.map((post) => (
            <PostCard 
              key={post.pageId} 
              post={post} 
              baseUrl={baseUrl}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--secondary-text-color)',
          minHeight: '30vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '1.1rem',
            marginBottom: '0.5rem',
            width: '100%'
          }}>
            {emptyMessage}
          </div>
          <div style={{
            fontSize: '0.9rem'
          }}>
            {emptyDescription}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '4rem',
          marginBottom: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(55, 53, 47, 0.16)',
        }}>
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
                  lineHeight: '1',
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
    </div>
  )
}
