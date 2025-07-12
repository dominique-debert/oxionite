import React from 'react'
import type { PageInfo } from '@/lib/types'
import styles from './styles.module.css'
import cs from 'classnames'

interface HomeNavProps {
  homePages: PageInfo[]
  activeTab: string
  onNavClick: (tab: string, pageId?: string) => void
}

const HomeNav: React.FC<HomeNavProps> = ({ homePages, activeTab, onNavClick }) => {
  const navItems = ['Recent Posts', 'Categories', 'Tags']

  return (
    <nav className={styles.homeNav}>
      {navItems.map((item) => (
        <button
          key={item}
          className={cs(styles.navItem, activeTab === item && styles.active)}
          onClick={() => onNavClick(item)}
        >
          {item}
        </button>
      ))}
      {homePages.map((page) => (
        <button
          key={page.pageId}
          className={cs(styles.navItem, activeTab === page.title && styles.active)}
          onClick={() => onNavClick(page.title, page.pageId)}
        >
          {page.title}
        </button>
      ))}
    </nav>
  )
}

export default HomeNav 