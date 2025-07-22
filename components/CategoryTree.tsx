'use client'

import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect,useState } from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import styles from 'styles/components/CategoryTree.module.css'

import type { PageInfo } from '@/lib/types'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  block?: any // For search functionality
  expandedItems: Record<string, boolean>
  toggleItemExpanded: (id: string) => void
}

interface CategoryItemProps {
  item: PageInfo
  level: number
  isExpanded: boolean
  toggleExpanded: () => void
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



const CategoryItem: React.FC<CategoryItemProps> = ({ item, level, isExpanded, toggleExpanded }) => {
  const isCategory = item.type === 'Category'
  const router = useRouter()
  const { asPath } = router

  const locale = router.locale || 'en'
  const pageUrl = `/${locale}/${item.slug}`
  const isActive = asPath === pageUrl

  const postCount = isCategory ? countPostsRecursively(item) : 0

  const linkClassName = `sidenav-item ${isActive ? 'active' : ''} ${item.type === 'Post' ? styles.postItem : ''}`;

  return (
            <div
      className={styles.categoryItemContainer}
      style={{ paddingLeft: `${level * 12}px` }}
    >
      {isCategory ? (
        <button 
          onClick={toggleExpanded} 
          className={styles.expandButton}
        >
          {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
        </button>
      ) : (
        <span className={styles.indentPlaceholder} />
      )}

                    <Link href={pageUrl} className={linkClassName}>
        <span className={styles.title}>{item.title}</span>
        {isCategory && <span className={styles.postCount}>{postCount}</span>}
      </Link>
    </div>
  )
}

// This is the main component that will hold the state
export const CategoryTree: React.FC<Omit<CategoryTreeProps, 'expandedItems' | 'toggleItemExpanded'>> = ({ 
  items, 
  level = 0, 
  block 
}) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({}) 
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (items && !hasInitialized) {
      const initialExpandedState: Record<string, boolean> = {}
      const setInitialState = (currentItems: PageInfo[]) => {
        for (const item of currentItems) {
          const hasChildren = item.children && item.children.length > 0
          // Expand if it's a category with children that are not posts
          if (item.type === 'Category' && hasChildren && !item.children.some(child => child.type === 'Post')) {
            initialExpandedState[item.pageId] = true
            setInitialState(item.children) // Recurse
          }
        }
      }
      setInitialState(items)
      setExpandedItems(initialExpandedState)
      setHasInitialized(true)
    }
  }, [items, hasInitialized])



  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // A recursive renderer component
  const RecursiveCategoryTree: React.FC<Omit<CategoryTreeProps, 'block'>> = ({ items, level = 0, expandedItems, toggleItemExpanded }) => {
    const sortedItems = items?.sort((a, b) => {
      if (a.type === 'Category' && b.type !== 'Category') return -1;
      if (a.type !== 'Category' && b.type === 'Category') return 1;
      return 0;
    });

    return (
      <div className={styles.recursiveContainer}>
        {sortedItems?.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = !!expandedItems[item.pageId];

          return (
            <div key={item.pageId} className={styles.itemWrapper}>
              <CategoryItem
                item={item}
                level={level}
                isExpanded={isExpanded}
                toggleExpanded={() => toggleItemExpanded(item.pageId)}
              />
              {hasChildren && isExpanded && (
                <div 
                  className={styles.line} 
                  style={{ left: `${level * 12 + 11}px` }}
                />
              )}
              {hasChildren && (
                <div className={`${styles.childrenContainer} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                  <div className={styles.childrenContent}>
                    <RecursiveCategoryTree
                      items={item.children!}
                      level={level + 1}
                      expandedItems={expandedItems}
                      toggleItemExpanded={toggleItemExpanded}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <RecursiveCategoryTree items={items} level={level} expandedItems={expandedItems} toggleItemExpanded={toggleItemExpanded} />
} 