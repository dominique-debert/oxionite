import React from 'react'
import Image from 'next/image'
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils'
import { type PageBlock } from 'notion-types'
import { mapImageUrl } from '@/lib/map-image-url'

interface PostHeaderProps {
  block: any
  recordMap: any
  isBlogPost: boolean
  isMobile?: boolean
}

export const PostHeader: React.FC<PostHeaderProps> = ({ 
  block, 
  recordMap, 
  isBlogPost,
  isMobile = false
}) => {
  if (!isBlogPost || !block || block.parent_table !== 'collection') {
    return null
  }

  // Extract data
  const title = getBlockTitle(block, recordMap)
  const author = getPageProperty<string>('Author', block, recordMap)
  const published = getPageProperty<number>('Published', block, recordMap)
  
  // Debug tags - try different possible formats
  const tagsRaw = getPageProperty('Tags', block, recordMap)
  console.log('Tags raw data:', tagsRaw, typeof tagsRaw)
  
  // Handle different tag formats and filter out empty/invalid tags
  let tags: string[] = []
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw
      .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag: any) => tag.trim())
  } else if (typeof tagsRaw === 'string' && tagsRaw.trim().length > 0) {
    tags = [tagsRaw.trim()]
  } else if (tagsRaw && typeof tagsRaw === 'object') {
    // Tags might be stored as multi_select with different structure
    const tagObj = tagsRaw as any
    if (tagObj.multi_select) {
      tags = tagObj.multi_select
        .map((tag: any) => tag.name || tag)
        .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: any) => tag.trim())
    } else if (tagObj.name && typeof tagObj.name === 'string' && tagObj.name.trim().length > 0) {
      tags = [tagObj.name.trim()]
    }
  }
  
  // Format published date
  const formattedPublished = published
    ? formatDate(published, { month: 'long' })
    : null

  // Extract cover image
  const pageBlock = block as PageBlock
  const pageCover = pageBlock.format?.page_cover
  const coverImageUrl = pageCover ? mapImageUrl(pageCover, block) : null
  const coverPosition = pageBlock.format?.page_cover_position || 0.5

  return (
    <div style={{
      maxWidth: 'var(--notion-max-width, 800px)',
      paddingLeft: '2.5rem',
      paddingRight: '1rem',
      paddingTop: '2rem',
      width: '100%'
    }}>
      {/* Title */}
      <h1 style={{
        fontSize: '3rem',
        fontWeight: '700',
        lineHeight: '1.2',
        margin: '0 0 1.5rem 0',
        color: 'var(--fg-color, #000)',
        wordBreak: 'keep-all'
      }}>
        {title}
      </h1>

      {/* Author and Published Date Row */}
      {(author || formattedPublished) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '1.5rem',
          fontSize: '1rem',
          gap: '0.5rem'
        }}>
          {/* Author */}
          {author && (
            <span style={{
              fontWeight: '600',
              color: 'var(--fg-color, #000)'
            }}>
              {author}
            </span>
          )}
          
          {/* Separator dot */}
          {author && formattedPublished && (
            <span style={{
              color: 'var(--fg-color-2, #868e96)',
              fontWeight: '400'
            }}>
              •
            </span>
          )}
          
          {/* Published Date */}
          {formattedPublished && (
            <span style={{
              color: 'var(--fg-color-2, #868e96)',
              fontWeight: '400'
            }}>
              {formattedPublished}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2rem'
        }}>
          {tags.map((tag, index) => (
            <span
              key={index}
              style={{
                backgroundColor: 'var(--fg-color, #000)',
                color: 'var(--bg-color, #fff)',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '500',
                letterSpacing: '0.025em',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Cover Image */}
      {coverImageUrl && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: isMobile ? '0' : '400px',
          aspectRatio: isMobile ? '16 / 9' : 'auto',
          paddingBottom: isMobile ? '56.25%' : '0', // 16:9 ratio = 9/16 = 0.5625 = 56.25%
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <Image
            src={coverImageUrl}
            alt={title || 'Cover image'}
            fill
            style={{
              objectFit: 'cover',
              objectPosition: `center ${(1 - coverPosition) * 100}%`
            }}
            priority
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        </div>
      )}
    </div>
  )
} 