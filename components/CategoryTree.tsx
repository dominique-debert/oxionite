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
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'
  const router = useRouter()
  const { asPath } = router

  useEffect(() => {
    setHasMounted(true)
    if (hasChildren) {
      setIsExpanded(true)
    }
  }, [hasChildren])

  const locale = router.locale || 'en'
  const pageUrl = `/${locale}/${item.slug}`
  const isActive = asPath === pageUrl

  const postCount = isCategory ? countPostsRecursively(item) : 0

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const linkClassName = `sidenav-item ${isActive ? 'active' : ''}`;

  return (
    <div>
      <div
        className={styles.categoryItemContainer}
        style={{ paddingLeft: `${level * 12}px` }}
      >
        {hasChildren && (
          <button onClick={toggleExpanded} className={styles.expandButton}>
            {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
          </button>
        )}
        <Link href={pageUrl} className={linkClassName}>
          <span className={styles.title}>{item.title}</span>
          {postCount > 0 && <span className={styles.postCount}>{postCount}</span>}
        </Link>
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