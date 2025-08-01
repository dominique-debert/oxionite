import { IoMoonSharp, IoSunnyOutline, IoMenuOutline } from 'react-icons/io5'
import { FaTags } from 'react-icons/fa'
import { useRouter } from 'next/router'
import Link from 'next/link'

import React from 'react'


import type * as types from '@/lib/context/types'
import { isSearchEnabled } from '@/lib/config'
import { useI18n } from '@/lib/i18n'

import { useDarkMode } from '@/lib/use-dark-mode'
import { getBlockTitle } from 'notion-utils'

import siteConfig from '../site.config'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageSocial } from './PageSocial'
import { SearchModal } from './SearchModal'

function ToggleThemeButton() {
  const [hasMounted, setHasMounted] = React.useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <button
      className="glass-item"
      onClick={toggleDarkMode}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ opacity: hasMounted ? 1 : 0 }}
    >
      {hasMounted && isDarkMode ? <IoMoonSharp /> : <IoSunnyOutline />}
    </button>
  )
}

function MobileMenuButton({ onToggle }: { onToggle: () => void }) {
  return (
    <button className="glass-item" onClick={onToggle} title="Toggle menu">
      <IoMenuOutline />
    </button>
  )
}

interface BreadcrumbItem {
  title: string
  pageInfo?: types.PageInfo
  href?: string
}

function findPagePath(
  pageId: string,
  tree: types.PageInfo[]
): BreadcrumbItem[] | null {
  for (const item of tree) {
    const href =
      item.type === 'Post'
        ? `/post/${item.slug}`
        : item.type === 'Category'
        ? `/category/${item.slug}`
        : `/${item.slug}`

    const currentPath = [
      {
        title: item.title || 'Untitled',
        pageInfo: item,
        href
      }
    ]

    if (item.pageId === pageId) {
      return currentPath
    }

    if (item.children) {
      const subPath = findPagePath(pageId, item.children)
      if (subPath) {
        return [...currentPath, ...subPath]
      }
    }
  }

  return null
}

interface TopNavProps {
  pageProps: types.PageProps
  isMobile?: boolean
  isSideNavCollapsed?: boolean
  onToggleMobileMenu?: () => void
}

export const TopNav: React.FC<TopNavProps> = ({
  pageProps,
  isMobile,
  isSideNavCollapsed,
  onToggleMobileMenu
}) => {
  const router = useRouter()
  const { siteMap, pageId, recordMap } = pageProps
  const { locale } = router
  const t = useI18n(locale)
  const breadcrumbs = React.useMemo((): BreadcrumbItem[] => {
    const { pathname, query, asPath } = router



    // Build hierarchical breadcrumbs from navigation tree and current page
    if (!siteMap) return []

    const breadcrumbs: BreadcrumbItem[] = [
      {
        title: siteConfig.name,
        href: '/'
      }
    ]

    // If we're on the root page, just return the base breadcrumb
    if (pathname === '/') {
      return breadcrumbs
    }

    if (!pageId) {
      // Handle /all-tags page
      if (pathname === '/all-tags') {
        return [
          ...breadcrumbs,
          {
            title: t.allTags,
            href: '/all-tags'
          }
        ]
      }

      // Handle tag pages
      if (pathname.startsWith('/tag/')) {
        const tag = query.tag as string
        if (tag) {
          return [
            ...breadcrumbs,
            {
              title: t.allTags,
              href: '/all-tags'
            },
            {
              title: `#${tag}`,
              pageInfo: {
                pageId: `tag-${tag}`,
                title: `#${tag}`
              } as types.PageInfo,
              href: `/tag/${tag}`
            }
          ]
        }
      }

      return breadcrumbs
    }

    // Build breadcrumbs from navigation tree
    const path = findPagePath(pageId, siteMap.navigationTree || [])
    if (path && path.length > 0) {
      return [...breadcrumbs, ...path]
    }

    // Fallback: Build from URL structure
    const pathSegments = asPath.split('/').filter(Boolean)
    const postIndex = pathSegments.indexOf('post')
    
    if (postIndex !== -1) {


      const postSegments = pathSegments.slice(postIndex + 1)
      let currentPath = '/post'
      let isFirst = true
      
      for (const segment of postSegments) {
        currentPath += `/${segment}`
        
        let pageInfo: types.PageInfo | undefined
        let title: string
        
        if (isFirst) {
          // Root page - find by slug
          pageInfo = Object.values(siteMap.pageInfoMap).find(p => p.slug === segment)
          title = pageInfo?.title || 'Untitled'
          isFirst = false
        } else {
          // Subpage - extract page ID and get actual title from recordMap
          let extractedPageId: string
          
          if (segment.includes('-')) {
            // Extract full UUID using regex
            const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i
            const match = segment.match(uuidRegex)
            if (match) {
              extractedPageId = match[1]
              
              // Try to get title from recordMap first, then fallback to siteMap
              const block = recordMap?.block?.[extractedPageId]?.value
              title = (block ? getBlockTitle(block, recordMap) : undefined) || 
                     siteMap.pageInfoMap[extractedPageId]?.title || 
                     'Untitled'
            } else {
              extractedPageId = segment
              const block = recordMap?.block?.[extractedPageId]?.value
              title = (block ? getBlockTitle(block, recordMap) : undefined) || 
                     siteMap.pageInfoMap[extractedPageId]?.title || 
                     'Untitled'
            }
          } else {
            extractedPageId = segment
            const block = recordMap?.block?.[extractedPageId]?.value
            title = (block ? getBlockTitle(block, recordMap) : undefined) || 
                   siteMap.pageInfoMap[extractedPageId]?.title || 
                   'Untitled'
          }
        }
        
        breadcrumbs.push({
          title,
          pageInfo: pageInfo || { pageId: segment, title } as types.PageInfo,
          href: currentPath
        })
      }
    }
    
    return breadcrumbs
  }, [siteMap, pageId, router, recordMap, t.allTags])

  return (
    <nav className="glass-nav">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0
        }}
      >
        {isSideNavCollapsed && onToggleMobileMenu && (
          <MobileMenuButton onToggle={onToggleMobileMenu} />
        )}
        <div className="glass-breadcrumb">
          {isMobile ? (
            <Link href="/" className="breadcrumb-item active">
              {siteConfig.name}
            </Link>
          ) : (
            breadcrumbs.map((crumb, index) => {
              const isLastCrumb = index === breadcrumbs.length - 1
              const isFirstCrumb = index === 0
              const { pathname } = router
              
              return (
                <React.Fragment key={index}>
                  {!isFirstCrumb && <span className="breadcrumb-separator">›</span>}
                  {isLastCrumb || !crumb.href ? (
                    <span className="breadcrumb-item active">
                      {(index === 1 && pathname.startsWith('/tag/') && crumb.title === 'All Tags') || 
                       (index === 1 && pathname === '/all-tags' && crumb.title === 'All Tags') ? (
                        <>
                          <FaTags style={{ marginRight: '0.25rem', fontSize: '0.8em' }} />
                          {crumb.title}
                        </>
                      ) : (
                        crumb.title
                      )}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="breadcrumb-item">
                      {(index === 1 && pathname.startsWith('/tag/') && crumb.title === t.allTags) || 
                       (index === 1 && pathname === '/all-tags' && crumb.title === t.allTags) ? (
                        <>
                          <FaTags style={{ marginRight: '0.25rem', fontSize: '0.8em' }} />
                          {crumb.title}
                        </>
                      ) : (
                        crumb.title
                      )}
                    </Link>
                  )}
                </React.Fragment>
              )
            })
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {!isMobile && <PageSocial header />}
        <LanguageSwitcher />
        <ToggleThemeButton />
        {isSearchEnabled && <SearchModal />}
      </div>
    </nav>
  )
}