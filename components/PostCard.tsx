import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

import type * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

export interface PostCardProps {
  post: {
    pageId: string
    title: string
    description: string | null
    date: string | null
    slug: string
    language: string
    coverImage?: string
    coverImageBlock?: types.Block
  }
  baseUrl?: string
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

export function PostCard({ post, baseUrl = '' }: PostCardProps) {
  const { isDarkMode } = useDarkMode()

  const postUrl = `/post/${post.slug}`

  return (
    <Link href={postUrl} legacyBehavior>
      <article
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          textDecoration: 'none',
          color: 'inherit',
          height: '100%',
          boxShadow: isDarkMode
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = isDarkMode
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = isDarkMode
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        {post.coverImage && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '200px',
            overflow: 'hidden',
          }}>
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              style={{
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            />
          </div>
        )}

        <div style={{
          padding: '1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              lineHeight: '1.4',
              margin: '0 0 0.5rem 0',
              color: 'var(--primary-text-color)',
            }}>
              {post.title}
            </h3>

            {post.description && (
              <p style={{
                fontSize: '0.95rem',
                color: 'var(--secondary-text-color)',
                lineHeight: '1.5',
                margin: '0 0 1rem 0',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {post.description}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            fontSize: '0.875rem',
            color: 'var(--tertiary-text-color)',
          }}>
            {post.date && (
              <span>{formatDate(post.date)}</span>
            )}
            <span style={{
              color: 'var(--primary-highlight-color)',
              fontWeight: '500',
            }}>
              Read more →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
