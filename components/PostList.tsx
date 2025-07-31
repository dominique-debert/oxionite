import * as React from 'react'
import Link from 'next/link'

import { mapImageUrl } from '@/lib/map-image-url'
import type * as types from '@/lib/context/types'
import styles from '@/styles/components/PostList.module.css'

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
  postsPerPage?: number
  title?: string
  description?: string
  emptyMessage?: string
  emptyDescription?: string
}

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  } catch (err) {
    console.error(`Invalid date string: ${dateString}`, err)
    return dateString
  }
}

// PostCard component merged into PostList
const PostCard = ({ post }: { post: PostListProps['posts'][0] }) => {
  const postUrl = `/post/${post.slug}`

  return (
    <Link href={postUrl} legacyBehavior>
      <a className={styles.cardLink}>
        <article className={styles.cardArticle}>
          {/* Cover Image */}
          {post.coverImage && post.coverImageBlock && (
            <div
              className={styles.cardCoverImage}
              style={{
                backgroundImage: `url('${mapImageUrl(post.coverImage, post.coverImageBlock)}')`,
              }}
            />
          )}

          {/* Content */}
          <div className={styles.cardContent}>
            <div>
              <h2 className={styles.cardTitle}>
                {post.title}
              </h2>
              {post.date && (
                <div className={styles.cardDate}>
                  {formatDate(post.date)}
                </div>
              )}
              {post.description && (
                <p className={styles.cardDescription}>
                  {post.description}
                </p>
              )}
            </div>
          </div>
        </article>
      </a>
    </Link>
  )
}

export function PostList({ 
  posts, 
  title, 
  description, 
  emptyMessage = "No posts found.",
  emptyDescription = "Try checking back later or explore other categories."
}: PostListProps) {
  const [currentPage, setCurrentPage] = React.useState(1)


  const totalPages = Math.ceil(posts.length / 5)
  const startIndex = (currentPage - 1) * 5
  const endIndex = startIndex + 5
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
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
    }}>
      {title && (
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
            {title}
          </h1>
          {description && (
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--secondary-text-color)',
              lineHeight: '1.6',
              marginBottom: '1rem'
            }}>
              {description}
            </p>
          )}

        </div>
      )}

      {currentPosts.length > 0 ? (
        <div className={styles.postListContainer}>
          {currentPosts.map((post) => (
            <PostCard 
              key={post.pageId} 
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className={styles.postListEmpty}>
          <div className={styles.postListEmptyMessage}>
            {emptyMessage}
          </div>
          <div className={styles.postListEmptyDescription}>
            {emptyDescription}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.postListPagination}>
          {getPageNumbers().map((pageNum, index) =>
            typeof pageNum === 'string' ? (
              <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>
                {pageNum}
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`${styles.paginationButton} ${pageNum === currentPage ? styles.active : ''}`}
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
