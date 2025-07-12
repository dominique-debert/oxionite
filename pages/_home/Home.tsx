import React, { useState, useMemo } from 'react'
import type { PageProps, PageInfo, ExtendedRecordMap } from '@/lib/types'
import { PageHead } from '../../components/PageHead'
import { NotionPage } from '../../components/NotionPage'

import Hero from './Hero'
import HomeNav from './HomeNav'
import RecentPosts from './RecentPosts'
import Categories from './Categories'
import Tags from './Tags'
import styles from './styles.module.css'

export const Home: React.FC<PageProps> = ({ site, siteMap, homeRecordMaps }) => {
  const [activeTab, setActiveTab] = useState<string>('Recent Posts')
  const [activeNotionPageId, setActiveNotionPageId] = useState<string | null>(null)

  const homePages = useMemo(() => {
    if (!siteMap) return []
    return Object.values(siteMap.pageInfoMap).filter(
      (page: PageInfo) => page.type === 'Home'
    )
  }, [siteMap])

  const handleNavClick = (tab: string, pageId?: string) => {
    setActiveTab(tab)
    if (pageId) {
      setActiveNotionPageId(pageId)
    } else {
      setActiveNotionPageId(null)
    }
  }

  const renderActiveComponent = () => {
    if (activeNotionPageId && homeRecordMaps?.[activeNotionPageId]) {
      return (
        <NotionPage
          site={site}
          recordMap={homeRecordMaps[activeNotionPageId]}
          pageId={activeNotionPageId}
        />
      )
    }

    switch (activeTab) {
      case 'Recent Posts':
        return <RecentPosts siteMap={siteMap} />
      case 'Categories':
        return <Categories siteMap={siteMap} />
      case 'Tags':
        return <Tags siteMap={siteMap} />
      default:
        return <RecentPosts siteMap={siteMap} />
    }
  }

  if (!site || !siteMap) {
    return <div>Loading...</div>
  }

  return (
    <>
      <PageHead
        site={site}
        title={site.name}
        description={site.description}
      />

      <div className={styles.homeContainer}>
        <Hero site={site} />
        <HomeNav
          homePages={homePages}
          activeTab={activeTab}
          onNavClick={handleNavClick}
        />
        <main className={styles.mainContent}>
          {renderActiveComponent()}
        </main>
      </div>
    </>
  )
} 