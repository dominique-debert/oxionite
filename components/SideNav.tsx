'use client'

import * as React from 'react'
import { useRouter } from 'next/router'
import cs from 'classnames'

import type * as types from '@/lib/types'
import { CategoryTree } from './CategoryTree'
import { useI18n } from '@/lib/i18n'
import { useDarkMode } from '@/lib/use-dark-mode'
import styles from '@/styles/components/SideNav.module.css'

export const SideNav = ({ 
  siteMap, 
  block,
  isMobile = false,
  isMobileMenuOpen = false
}: { 
  siteMap: types.SiteMap
  block?: any
  isMobile?: boolean
  isMobileMenuOpen?: boolean
}) => {
  const router = useRouter()
  const { locale } = router
  const { isDarkMode } = useDarkMode()
  const t = useI18n(locale || 'ko')

  const filterNavigationItems = React.useCallback((items: types.PageInfo[], currentLocale: string): types.PageInfo[] => {
    if (!items || !Array.isArray(items)) return []
    
    return items
      .filter((item: types.PageInfo) => {
        if (item.type === 'Home') return false
        if (!item.language) return true
        return item.language.toLowerCase() === currentLocale?.toLowerCase()
      })
      .map((item: types.PageInfo) => {
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: filterNavigationItems(item.children, currentLocale)
          }
        }
        return item
      })
  }, [])

  const filteredNavigationTree = React.useMemo(() => {
    if (!siteMap?.navigationTree || !locale) {
      return siteMap?.navigationTree || []
    }
    return filterNavigationItems(siteMap.navigationTree, locale)
  }, [siteMap?.navigationTree, locale, filterNavigationItems])

  if (!siteMap?.navigationTree || filteredNavigationTree.length === 0) {
    return null
  }

  const asideClasses = cs(
    styles.sideNav,
    'glass-sidenav',
    isDarkMode && styles.darkMode,
    isMobile ? styles.mobile : styles.desktop,
    isMobile && isMobileMenuOpen && styles.mobileOpen
  )

  return (
    <aside className={asideClasses} style={!isMobile ? { margin: '1rem 0 1rem 1rem' } : {}}>
      <CategoryTree items={filteredNavigationTree} block={block} />
    </aside>
  )
}