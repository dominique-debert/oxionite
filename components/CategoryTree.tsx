'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { PageInfo } from '@/lib/types'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
}

interface CategoryItemProps {
  item: PageInfo
  level: number
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const itemStyle = {
    paddingLeft: `${level * 16}px`
  }

  return (
    <div>
      <div 
        className="nav-item"
        style={itemStyle}
        onClick={hasChildren ? toggleExpanded : undefined}
      >
        {/* Toggle icon for categories with children */}
        {hasChildren && (
          <span className="toggle-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        
        {/* Category/Post icon */}
        <span className="item-icon">
          {isCategory ? '📁' : '📄'}
        </span>

        {/* Title - clickable for posts, toggle for categories */}
        {isCategory && hasChildren ? (
          <span className="category-title">{item.title}</span>
        ) : (
          <Link href={`/${item.pageId}`} className="item-link">
            {item.title}
          </Link>
        )}
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <CategoryTree items={item.children} level={level + 1} />
      )}
    </div>
  )
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ items, level = 0 }) => {
  return (
    <div className="category-tree">
      {items.map((item) => (
        <CategoryItem key={item.pageId} item={item} level={level} />
      ))}
    </div>
  )
} 