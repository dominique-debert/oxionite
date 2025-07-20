import React, { useState } from 'react'
import Image from 'next/image'
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils'
import { PageAuthor } from './PageAuthor'
import { type PageBlock } from 'notion-types'
import { mapImageUrl } from '@/lib/map-image-url'

interface PostHeaderProps {
  block: any
  recordMap: any
  isBlogPost: boolean // Kept for logic, but rendering is controlled by variant
  isMobile?: boolean
  variant?: 'full' | 'simple'
}

export const PostHeader: React.FC<PostHeaderProps> = ({ 
  block, 
  recordMap, 
  isBlogPost,
  isMobile = false,
  variant = 'full' // Default to 'full'
}) => {
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null)

  // For 'full' variant, we require it to be a blog post from a collection
  if (variant === 'full' && (!isBlogPost || !block || block.parent_table !== 'collection')) {
    return null
  }

  // For 'simple' variant, we just need the block
  if (variant === 'simple' && !block) {
    return null
  }

  // Extract data
  const title = getBlockTitle(block, recordMap)
  const authors = getPageProperty<string[]>('Authors', block, recordMap) || []
  const published = getPageProperty<number>('Published', block, recordMap)
  
  // Tags logic remains the same...
  const tagsRaw = getPageProperty('Tags', block, recordMap)
  let tags: string[] = []
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw
      .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag: any) => tag.trim())
  } else if (typeof tagsRaw === 'string' && tagsRaw.trim().length > 0) {
    tags = [tagsRaw.trim()]
  } else if (tagsRaw && typeof tagsRaw === 'object') {
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
  
  const formattedPublished = published
    ? formatDate(published, { month: 'long' })
    : null

  const pageBlock = block as PageBlock
  const pageCover = pageBlock.format?.page_cover
  const coverImageUrl = pageCover ? mapImageUrl(pageCover, block) : null
  const coverPosition = pageBlock.format?.page_cover_position || 0.5

  return (
    <div style={{
      maxWidth: 'var(--notion-max-width, 800px)',
      paddingLeft: isMobile ? '2.5rem' : '1rem',
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

      {/* Render metadata only for the 'full' variant */}
      {variant === 'full' && (
        <>
          {/* Author and Published Date Row */}
          {(authors.length > 0 || formattedPublished) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap', // Allow wrapping on smaller screens
              marginBottom: '1.5rem',
              fontSize: '1rem',
              gap: '0.5rem'
            }}>
              {authors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {authors.map((authorName) => (
                    <PageAuthor key={authorName} authorName={authorName} />
                  ))}
                </div>
              )}
              {authors.length > 0 && formattedPublished && <span style={{ color: 'var(--secondary-text-color)', fontWeight: '400' }}>•</span>}
              {formattedPublished && <span style={{ color: 'var(--secondary-text-color)', fontWeight: '400' }}>{formattedPublished}</span>}
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
                  className="notion-tag"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cover Image */}
      {coverImageUrl && (
        <div style={{
          position: 'relative',
          width: '100%',
          marginBottom: '2rem',
          // Dynamically set aspect ratio from image dimensions
          aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : undefined,
          // Hide container until aspect ratio is known to prevent layout shift
          opacity: imageAspectRatio ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          // Apply styles only when the image is visible
          borderRadius: imageAspectRatio ? '12px' : '0',
          boxShadow: imageAspectRatio
            ? '0 10px 30px rgba(0, 0, 0, 0.1)'
            : 'none',
          overflow: 'hidden'
        }}>
          <Image
            src={coverImageUrl}
            alt={title || 'Cover image'}
            fill
            style={{
              // Container has the correct aspect ratio, so 'cover' will fill it perfectly.
              objectFit: 'cover',
              objectPosition: `center ${(1 - coverPosition) * 100}%`
            }}
            onLoadingComplete={({ naturalWidth, naturalHeight }) => {
              if (naturalHeight > 0) {
                setImageAspectRatio(naturalWidth / naturalHeight)
              }
            }}
            priority
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        </div>
      )}
    </div>
  )
} 