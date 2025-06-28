'use client'

import * as React from 'react'

import type * as types from '@/lib/types'
import { CategoryTree } from './CategoryTree'
import styles from './SideNav.module.css'

export const SideNav = ({ 
  siteMap, 
  block 
}: { 
  siteMap: types.SiteMap
  block?: any // For search functionality
}) => {
  // Use the pre-computed navigation tree from getSiteMap
  if (!siteMap?.navigationTree) {
    return null
  }

  return (
    <aside className={styles.sideNav}>
      <div className={styles.title}>Navigation</div>
      <CategoryTree items={siteMap.navigationTree} block={block} />
    </aside>
  )
} 