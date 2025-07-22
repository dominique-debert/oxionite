import cs from 'classnames'
import React from 'react'
import styles from 'styles/pages/home.module.css'

import type { PageInfo } from '@/lib/types'

interface HomeNavProps {
  homePages: PageInfo[]
  activeTab: string
  onNavClick: (tab: string, pageId?: string) => void
}

export default function HomeNav({ homePages, activeTab, onNavClick }: HomeNavProps) {
  const navItems = ['Recent Posts', 'Categories', 'Tags']

  return (
    <nav className={styles.homeNav}>
      {homePages.map((page) => (
        <button
          key={page.pageId}
          className={cs(styles.navItem, activeTab === page.title && styles.active)}
          onClick={() => onNavClick(page.title, page.pageId)}
        >
          {page.title}
        </button>
      ))}
      {navItems.map((item) => (
        <button
          key={item}
          className={cs(styles.navItem, activeTab === item && styles.active)}
          onClick={() => onNavClick(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  )
}

 