import React, { useState, useMemo } from 'react'
import type { PageProps, PageInfo, ExtendedRecordMap } from '@/lib/types'
import { PageHead } from '../../components/PageHead'
import { NotionPage } from '../../components/NotionPage'

import Hero from './Hero'
import HomeNav from './HomeNav'
import RecentPosts from './RecentPosts'
import Categories from './Categories'
import { Tags } from './Tags'
import styles from 'styles/pages/home.module.css'

export const Home: React.FC<PageProps & { setBackgroundAsset: (asset: { type: 'image' | 'video'; src: string } | null) => void }> = ({
  setBackgroundAsset,
  site,
  siteMap,
  homeRecordMaps,
  isMobile
}) => {
  const homePages = useMemo(() => {
    if (!siteMap) return []
    return Object.values(siteMap.pageInfoMap).filter(
      (page: PageInfo) => page.type === 'Home'
    )
  }, [siteMap])
  
  const getInitialTab = () => {
    if (homePages.length > 0 && homePages[0]) {
      return {
        tab: homePages[0].title,
        pageId: homePages[0].pageId
      }
    }
    return {
      tab: 'Recent Posts',
      pageId: null
    }
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab().tab)
  const [activeNotionPageId, setActiveNotionPageId] = useState<string | null>(getInitialTab().pageId)

  const handleNavClick = (tab: string, pageId?: string) => {
    setActiveTab(tab)
    if (pageId) {
      setActiveNotionPageId(pageId)
    } else {
      setActiveNotionPageId(null)
    }
  }

  const isNotionPageActive =
    activeNotionPageId && homeRecordMaps?.[activeNotionPageId]

  const renderTabs = () => {
    switch (activeTab) {
      case 'Recent Posts':
        return <RecentPosts siteMap={siteMap} />
      case 'Categories':
        return <Categories siteMap={siteMap} />
      case 'Tags':
        return <Tags />
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
        <Hero site={site} isMobile={isMobile || false} onAssetChange={setBackgroundAsset} />
        <HomeNav
          homePages={homePages}
          activeTab={activeTab}
          onNavClick={handleNavClick}
        />

        {/* Render non-Notion tabs inside the main content area */}
        {!isNotionPageActive && (
          <main className={styles.mainContent}>{renderTabs()}</main>
        )}
      </div>

      {/* Render NotionPage outside the main container but with the same padding */}
      {isNotionPageActive && (
        <div className={styles.homeNotionContainer}>
          <NotionPage
            site={site}
            recordMap={homeRecordMaps[activeNotionPageId]}
            pageId={activeNotionPageId}
            isMobile={isMobile}
          />
        </div>
      )}
    </>
  )
} 