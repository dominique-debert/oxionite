'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Search } from 'react-notion-x'
import type { PageInfo } from '@/lib/types'
import { isSearchEnabled } from '@/lib/config'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  block?: any // For search functionality
}

interface CategoryItemProps {
  item: PageInfo
  level: number
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'
  const router = useRouter()
  
  // Get current locale or default to 'en'
  const locale = router.locale || 'en'
  
  // Generate URL: /locale/slug
  const pageUrl = `/${locale}/${item.slug}`

  const toggleExpanded = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const itemStyle = {
    paddingLeft: `${level * 16}px`,
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '2px'
  }

  return (
    <div>
      <div className="nav-item" style={itemStyle}>
        {/* Toggle icon for categories with children */}
        {hasChildren && (
          <span 
            className="toggle-icon"
            onClick={toggleExpanded}
            style={{ cursor: 'pointer', marginRight: '4px' }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        
        {/* Category/Post icon */}
        <span className="item-icon" style={{ marginRight: '4px' }}>
          {isCategory ? '📁' : '📄'}
        </span>

        {/* Title - always clickable to navigate to the page */}
        <Link href={pageUrl} className="item-link">
          {item.title}
        </Link>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <CategoryTree items={item.children} level={level + 1} />
      )}
    </div>
  )
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ items, level = 0, block }) => {
  return (
    <div className="category-tree">
      {/* Show search button only at the top level */}
      {level === 0 && isSearchEnabled && block && (
        <div style={{ marginBottom: '16px' }}>
          <Search block={block} title={null} />
        </div>
      )}
      
      {items.map((item) => (
        <CategoryItem key={item.pageId} item={item} level={level} />
      ))}
    </div>
  )
} 