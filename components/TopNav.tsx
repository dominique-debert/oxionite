import * as React from 'react'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'

import * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'
import { PageSocial } from './PageSocial'
import { LanguageSwitcher } from './LanguageSwitcher'

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

interface TopNavProps {
  pageProps: types.PageProps
  block?: any
}

export function TopNav({ pageProps, block }: TopNavProps) {
  const { siteMap } = pageProps
  
  // Build breadcrumbs from siteMap if available
  const breadcrumbs = React.useMemo(() => {
    if (!siteMap || !pageProps.pageId) return []
    
    const findPagePath = (pageId: string): string[] => {
      // Find the page in siteMap
      const findInMap = (items: any[], path: string[] = []): string[] | null => {
        for (const item of items) {
          if (item.pageId === pageId) {
            return [...path, item.title || item.name || 'Untitled']
          }
          if (item.children) {
            const result = findInMap(item.children, [...path, item.title || item.name || 'Untitled'])
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
        <span>🏠</span>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span style={{ margin: '0 0.5rem' }}>›</span>}
            <span style={{ 
              fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
              color: index === breadcrumbs.length - 1 ? 'var(--text-color, #000)' : 'var(--text-color, #666)'
            }}>
              {crumb}
            </span>
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