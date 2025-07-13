'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import type { PageInfo } from '@/lib/types'
import styles from 'styles/components/CategoryTree.module.css'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  block?: any // For search functionality
}

interface CategoryItemProps {
  item: PageInfo
  level: number
}

// Utility function to count posts recursively
const countPostsRecursively = (item: PageInfo): number => {
  let count = 0
  
  // If this item is a post, count it
  if (item.type === 'Post') {
    count = 1
  }
  
  // Recursively count posts in children
  if (item.children && item.children.length > 0) {
    count += item.children.reduce((total, child) => {
      return total + countPostsRecursively(child)
    }, 0)
  }
  
  return count
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed to avoid hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'
  const router = useRouter()
  
  // Expand all categories after component mounts to avoid hydration issues
  useEffect(() => {
    setHasMounted(true)
    if (hasChildren) {
      setIsExpanded(true)
    }
  }, [hasChildren])
  
  // Get current locale or default to 'en'
  const locale = router.locale || 'en'
  
  // Generate URL: /locale/slug
  const pageUrl = `/${locale}/${item.slug}`

  // Count posts in this category (only for categories)
  const postCount = isCategory ? countPostsRecursively(item) : 0

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <div
        className={styles.categoryItemContainer}
        style={{
          paddingLeft: `${level * 20 + 8}px`, // Level-based indentation + base padding
        }}
      >
        {/* Expand/Collapse Arrow Button */}
        {hasChildren && (
          <button
            onClick={toggleExpanded}
            className={styles.expandButton}
          >
            {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
          </button>
        )}
        
        {/* Category/Post Content */}
        {isCategory ? (
          <Link 
            href={pageUrl}
            className={styles.categoryLink}
          >
            <span 
              className={`${styles.categoryTitle} ${hasChildren ? styles.categoryTitleWithChildren : styles.categoryTitleWithoutChildren}`}
            >
              {item.title}
            </span>
            {postCount > 0 && (
              <span className={styles.postCount}>
                {postCount}
              </span>
            )}
          </Link>
        ) : (
          <Link 
            href={pageUrl} 
            className={styles.postLink}
          >
            {item.title}
          </Link>
        )}
      </div>

      {isExpanded && hasChildren && (
        <CategoryTree items={item.children} level={(level || 0) + 1} />
      )}
    </div>
  )
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ 
  items, 
  level = 0, 
  block 
}) => {
  return (
    <div>
      {/* Category Items */}
      {items?.map((item) => (
        <CategoryItem key={item.pageId} item={item} level={level} />
      ))}
    </div>
  )
} 