'use client'

import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import styles from 'styles/components/CategoryTree.module.css'

import type { PageInfo } from '@/lib/context/types'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  expandedItems: Record<string, boolean>
  toggleItemExpanded: (id: string) => void
}

interface CategoryItemProps {
  item: PageInfo
  level: number
  isExpanded: boolean
  toggleExpanded: () => void
}

const countPostsRecursively = (item: PageInfo): number => {
  let count = 0
  if (item.type === 'Post' || item.type === 'Home') {
    count = 1
  }
  if (item.children && item.children.length > 0) {
    count += item.children.reduce((total, child) => total + countPostsRecursively(child), 0)
  }
  return count
}

function CategoryItem({ item, level, isExpanded, toggleExpanded }: CategoryItemProps) {
  const isCategory = item.type === 'Category'
  const router = useRouter()

  // Construct pageUrl without locale
  const pageUrl = item.type === 'Post' || item.type === 'Home'
    ? `/post/${item.slug}`
    : item.type === 'Category'
    ? `/category/${item.slug}`
    : `/${item.slug}`;
  
  // Clean asPath and pageUrl for comparison
  const cleanedAsPath = router.asPath.split('?')[0].split('#')[0].replace(/\/$/, '');
  const cleanedPageUrl = pageUrl.replace(/\/$/, '');
  const isActive = cleanedAsPath === cleanedPageUrl;

  const postCount = isCategory ? countPostsRecursively(item) : 0
  const linkClassName = `sidenav-item ${isActive ? 'active' : ''} ${item.type === 'Post' || item.type === 'Home' ? styles.postItem : ''}`

  return (
    <div className={styles.categoryItemContainer} style={{ paddingLeft: `${level * 16}px` }}>
      {isCategory ? (
        <button onClick={toggleExpanded} className={styles.expandButton}>
          {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
        </button>
      ) : (
        <span className={styles.indentPlaceholder} />
      )}
      <Link href={pageUrl} className={linkClassName} data-page-id={item.pageId}>
        <span className={styles.title}>{item.title}</span>
        {isCategory && <span className={styles.postCount}>{postCount}</span>}
      </Link>
    </div>
  )
}

function RecursiveCategoryTree({ items, level = 0, expandedItems, toggleItemExpanded }: CategoryTreeProps) {
  const sortedItems = items?.sort((a, b) => {
    if (a.type === 'Category' && b.type !== 'Category') return -1
    if (a.type !== 'Category' && b.type === 'Category') return 1
    return 0
  })

  return (
    <div className={styles.recursiveContainer}>
      {sortedItems?.map((item) => {
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = !!expandedItems[item.pageId]

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
                style={{ 
                  left: `${level * 16 + 11.49}px`,
                  top: '32px', 
                }}
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
        )
      })}
    </div>
  )
}

export function CategoryTree({ 
  items, 
  level = 0,
  expandedItems,
  toggleItemExpanded
}: CategoryTreeProps) {
    return (
    <div className={styles.categoryTreeWrapper}>
      <RecursiveCategoryTree items={items} level={level} expandedItems={expandedItems} toggleItemExpanded={toggleItemExpanded} />
    </div>
  )
}
