import * as React from 'react'
import Link from 'next/link'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'

import * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'
import { PageSocial } from './PageSocial'
import { LanguageSwitcher } from './LanguageSwitcher'
import siteConfig from '../site.config'

// Dark mode toggle button component
function ToggleThemeButton() {
  const [hasMounted, setHasMounted] = React.useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const onToggleTheme = React.useCallback(() => {
    toggleDarkMode()
  }, [toggleDarkMode])

  return (
    <button
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
        fontSize: '18px',
        color: 'var(--fg-color-icon)',
        opacity: hasMounted ? 1 : 0
      }}
      onClick={onToggleTheme}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {hasMounted && isDarkMode ? <IoMoonSharp /> : <IoSunnyOutline />}
    </button>
  )
}

interface BreadcrumbItem {
  title: string
  pageInfo?: types.PageInfo
}

interface TopNavProps {
  pageProps: types.PageProps
  block?: any
}

export function TopNav({ pageProps, block }: TopNavProps) {
  const { siteMap } = pageProps
  
  // Build breadcrumbs from siteMap if available
  const breadcrumbs = React.useMemo((): BreadcrumbItem[] => {
    if (!siteMap || !pageProps.pageId) return []
    
    const findPagePath = (pageId: string): BreadcrumbItem[] => {
      // Find the page in siteMap
      const findInMap = (items: types.PageInfo[], path: BreadcrumbItem[] = []): BreadcrumbItem[] | null => {
        for (const item of items) {
          const currentBreadcrumb: BreadcrumbItem = {
            title: item.title || 'Untitled',
            pageInfo: item
          }
          
          if (item.pageId === pageId) {
            return [...path, currentBreadcrumb]
          }
          if (item.children) {
            const result = findInMap(item.children, [...path, currentBreadcrumb])
            if (result) return result
          }
        }
        return null
      }
      
      return findInMap(siteMap.navigationTree || []) || []
    }
    
    return findPagePath(pageProps.pageId)
  }, [siteMap, pageProps.pageId])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 0',
      minHeight: '60px'
    }}>
      {/* Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '14px',
        color: 'var(--text-color, #666)'
      }}>
        <Link 
          href="/"
          style={{
            textDecoration: 'none',
            color: 'var(--text-color, #666)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease',
            fontWeight: '500',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-color-1, #f5f5f5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {siteConfig.name}
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            <span style={{ margin: '0 0.5rem' }}>›</span>
            {crumb.pageInfo && crumb.pageInfo.language && crumb.pageInfo.slug ? (
              <Link
                href={`/${crumb.pageInfo.language}/${crumb.pageInfo.slug}`}
                style={{
                  textDecoration: 'none',
                  fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                  color: index === breadcrumbs.length - 1 ? 'var(--text-color, #000)' : 'var(--text-color, #666)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (index !== breadcrumbs.length - 1) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-color-1, #f5f5f5)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {crumb.title}
              </Link>
            ) : (
              <span style={{ 
                fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                color: index === breadcrumbs.length - 1 ? 'var(--text-color, #000)' : 'var(--text-color, #666)',
                padding: '4px 6px'
              }}>
                {crumb.title}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Right side - Social buttons, language selector, and theme toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PageSocial variant="header" />
        <LanguageSwitcher />
        <ToggleThemeButton />
      </div>
    </div>
  )
} 