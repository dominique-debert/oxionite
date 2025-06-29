'use client'

import * as React from 'react'
import { useRouter } from 'next/router'

import type * as types from '@/lib/types'
import { CategoryTree } from './CategoryTree'
import { useI18n } from '@/lib/i18n'
import styles from './SideNav.module.css'

export const SideNav = ({ 
  siteMap, 
  block,
  isMobile = false,
  isMobileMenuOpen = false
}: { 
  siteMap: types.SiteMap
  block?: any // For search functionality
  isMobile?: boolean
  isMobileMenuOpen?: boolean
}) => {
  const router = useRouter()
  const { locale } = router
  
  // Get texts for current locale
  const t = useI18n(locale || 'ko')

  // Filter navigation tree by current locale
  const filterByLocale = React.useCallback((items: types.PageInfo[], currentLocale: string): types.PageInfo[] => {
    if (!items || !Array.isArray(items)) return []
    
    return items
      .filter((item: types.PageInfo) => {
        // Check if item has language property and matches current locale
        // If no language property, include it (for backward compatibility)
        if (!item.language) return true
        return item.language.toLowerCase() === currentLocale?.toLowerCase()
      })
      .map((item: types.PageInfo) => {
        // Recursively filter children
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: filterByLocale(item.children, currentLocale)
          }
        }
        return item
      })
  }, [])

  // Get filtered navigation tree for current locale
  const filteredNavigationTree = React.useMemo(() => {
    if (!siteMap?.navigationTree || !locale) {
      return siteMap?.navigationTree || []
    }
    
    return filterByLocale(siteMap.navigationTree, locale)
  }, [siteMap?.navigationTree, locale, filterByLocale])

  // Use the pre-computed navigation tree from getSiteMap
  if (!siteMap?.navigationTree || filteredNavigationTree.length === 0) {
    return null
  }

  // CSS classes for mobile/desktop behavior
  const sideNavClasses = [
    styles.sideNav,
    isMobile ? styles.mobile : styles.desktop,
    isMobile && isMobileMenuOpen ? styles.mobileOpen : ''
  ].filter(Boolean).join(' ')

  return (
    <aside className={sideNavClasses}>
      <CategoryTree items={filteredNavigationTree} block={block} />
    </aside>
  )
} 