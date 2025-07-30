'use client'

import cs from 'classnames'
import { useRouter } from 'next/router'
import * as React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'

import type * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'
import styles from '@/styles/components/SideNav.module.css'

import { CategoryTree } from './CategoryTree'
import GraphView from './GraphView'
import { HomeButton } from './HomeButton'

function filterNavigationItems(items: types.PageInfo[], currentLocale: string): types.PageInfo[] {
  if (!items || !Array.isArray(items)) return []

  return items
    .filter((item: types.PageInfo) => {
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
}

const findPathToActiveItem = (items: types.PageInfo[], activeSlug: string): string[] | null => {
  const cleanedActiveSlug = activeSlug.split('?')[0].split('#')[0].replace(/\/$/, '');

  for (const item of items) {
    const pageUrl = `/${item.slug}`.replace(/\/$/, '');
    if (pageUrl === cleanedActiveSlug) {
      return [item.pageId];
    }
    if (item.children) {
      const childPath = findPathToActiveItem(item.children, activeSlug);
      if (childPath) {
        return [item.pageId, ...childPath];
      }
    }
  }
  return null;
};

interface SideNavProps {
  siteMap: types.SiteMap
  isCollapsed?: boolean
  isMobileMenuOpen?: boolean
}

export function SideNav({ 
  siteMap, 
  isCollapsed = false,
  isMobileMenuOpen = false
}: SideNavProps) {
  const router = useRouter()
  const { locale, asPath } = router
  const { isDarkMode } = useDarkMode()

  const navRef = useRef<HTMLElement>(null)
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 })
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const filteredNavigationTree = React.useMemo(() => {
    if (!siteMap?.navigationTree || !locale) {
      return siteMap?.navigationTree || []
    }
    return filterNavigationItems(siteMap.navigationTree, locale)
  }, [siteMap?.navigationTree, locale])

  useEffect(() => {
    if (!filteredNavigationTree) return

    const newExpandedState: Record<string, boolean> = {}

    const setInitialExpansion = (currentItems: types.PageInfo[]) => {
      for (const item of currentItems) {
        const hasChildren = item.children && item.children.length > 0
        if (item.type === 'Category' && hasChildren && !item.children.some(child => child.type === 'Post')) {
          newExpandedState[item.pageId] = true
          if (item.children) {
            setInitialExpansion(item.children)
          }
        }
      }
    }
    setInitialExpansion(filteredNavigationTree)

    const activePath = findPathToActiveItem(filteredNavigationTree, asPath)
    if (activePath) {
      activePath.forEach(id => {
        newExpandedState[id] = true
      })
    }

    setExpandedItems(newExpandedState)
  }, [filteredNavigationTree, asPath])

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!navRef.current) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    let closestId: string | null = null;
    let minDistance = Infinity;

    const items = navRef.current.querySelectorAll<HTMLElement>('.sidenav-item');
    items.forEach((elem) => {
        const isInsideCollapsedContainer = elem.closest('[class*="childrenContainer"]:not([class*="expanded"])');
        const isRendered = elem.offsetWidth > 0 && elem.offsetHeight > 0;

        if (!isInsideCollapsedContainer && isRendered) {
            const itemRect = elem.getBoundingClientRect();
            const itemCenterX = itemRect.left + itemRect.width / 2;
            const itemCenterY = itemRect.top + itemRect.height / 2;

            const dx = mouseX - itemCenterX;
            const dy = mouseY - itemCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestId = elem.dataset.pageId || null;
            }
        }
    });

    setHoveredItemId(closestId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItemId(null)
  }, [])

  useEffect(() => {
    if (!navRef.current) return;

    let targetItem: HTMLElement | null = null;

    if (hoveredItemId) {
        targetItem = navRef.current.querySelector<HTMLElement>(`[data-page-id="${hoveredItemId}"]`);
    } else {
        targetItem = navRef.current.querySelector<HTMLElement>('.sidenav-item.active');
    }

    if (targetItem) {
        const isInsideCollapsedContainer = targetItem.closest('[class*="childrenContainer"]:not([class*="expanded"])');
        const isRendered = targetItem.offsetWidth > 0 && targetItem.offsetHeight > 0;

        if (!isInsideCollapsedContainer && isRendered) {
            const navRect = navRef.current.getBoundingClientRect();
            const itemRect = targetItem.getBoundingClientRect();

            setPillStyle({
                top: itemRect.top - navRect.top + navRef.current.scrollTop,
                left: itemRect.left - navRect.left,
                width: itemRect.width,
                height: itemRect.height,
                opacity: 1
            });
        } else {
            setPillStyle((prevStyle) => ({ ...prevStyle, opacity: 0 }));
        }
    } else {
        setPillStyle((prevStyle) => ({ ...prevStyle, opacity: 0 }));
    }
  }, [hoveredItemId, asPath, isMobileMenuOpen, siteMap, expandedItems]);

  const asideClasses = cs(
    styles.sideNav,
    'glass-sidenav',
    isDarkMode && styles.darkMode,
    isCollapsed ? styles.mobile : styles.desktop,
    isCollapsed && isMobileMenuOpen && styles.mobileOpen
  )

  return (
    <aside 
      ref={navRef}
      className={asideClasses}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <HomeButton />
      <div className="sidenav-pill" style={pillStyle} />
      <CategoryTree 
        items={filteredNavigationTree}
        expandedItems={expandedItems}
        toggleItemExpanded={toggleItemExpanded}
      />
      <GraphView siteMap={siteMap} viewType='sidenav' />
    </aside>
  )
}
