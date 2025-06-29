import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { createPortal } from 'react-dom'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import { IoSearchOutline } from '@react-icons/all-files/io5/IoSearchOutline'

import * as types from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'
import { isSearchEnabled } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
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

interface SearchResult {
  id: string
  title: string
  url: string
  snippet?: string
}

// Search button component
function SearchButton() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { isDarkMode } = useDarkMode()
  
  // Get texts for current locale
  const t = useI18n(router.locale || 'ko')

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const openModal = React.useCallback(() => {
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const handleSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/search-notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          ancestorId: siteConfig.rootNotionPageId,
          filters: {
            isDeletedOnly: false,
            excludeTemplates: true,
            isNavigableOnly: false,
            requireEditPermissions: false
          },
          limit: 20
        })
      })

      if (response.ok) {
        const data = await response.json() as any
        console.log('Search results raw data:', data)
        console.log('Search results array:', data.results)
        
        // Transform results to our format using recordMap data
        const transformedResults: SearchResult[] = data.results?.map((result: any) => {
          const blockId = result.id
          const block = data.recordMap?.block?.[blockId]?.value
          
          // Get title from block properties or use highlight text
          let title = 'Untitled'
          if (block?.properties?.title?.[0]?.[0]) {
            title = block.properties.title[0][0]
          } else if (result.highlight?.text) {
            title = result.highlight.text
          }
          
          // Generate proper URL based on block type and ID
          let url = `/${blockId.replace(/-/g, '')}`
          
          return {
            id: blockId,
            title: title,
            url: url,
            snippet: result.highlight?.text || ''
          }
        }) || []
        
        console.log('Transformed results:', transformedResults)
        setResults(transformedResults)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }, [handleSearch])

  const handleResultClick = React.useCallback((url: string) => {
    closeModal()
    router.push(url)
  }, [closeModal, router])

  // Close modal on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeModal])

  if (!isSearchEnabled) {
    return null
  }

  // Color schemes for light and dark mode
  const overlayBg = isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'
  const modalBg = isDarkMode ? 'rgba(32, 32, 32, 0.85)' : 'rgba(255, 255, 255, 0.85)'
  const modalBorder = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'
  const inputBg = isDarkMode ? 'rgba(32, 32, 32, 0.6)' : 'rgba(255, 255, 255, 0.6)'
  const inputBorder = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
  const inputBorderFocus = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.25)'
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  const hoverBg = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
  const resultBorder = isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlayBg,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)', // Safari support
        zIndex: 2147483647, // Maximum safe z-index value
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh'
      }}
      onClick={closeModal}
    >
      <div
        style={{
          backgroundColor: modalBg,
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '70vh',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 16px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${modalBorder}`,
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{
          padding: '20px 20px 16px 20px',
          borderBottom: `1px solid ${borderColor}`
        }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: `1px solid ${inputBorder}`,
              borderRadius: '8px',
              backgroundColor: inputBg,
              color: 'var(--fg-color)',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = inputBorderFocus
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = inputBorder
            }}
          />
        </div>

        {/* Search Results */}
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {isLoading && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--fg-color-2)'
            }}>
              {t.searching}
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--fg-color-2)'
            }}>
              {t.noResults}
            </div>
          )}

          {!isLoading && results.map((result) => (
            <div
              key={result.id}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                borderBottom: `1px solid ${resultBorder}`,
                transition: 'background-color 0.2s ease'
              }}
              onClick={() => handleResultClick(result.url)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div style={{
                fontWeight: '500',
                color: 'var(--fg-color)',
                marginBottom: '4px'
              }}>
                {result.title}
              </div>
              {result.snippet && (
                <div style={{
                  fontSize: '14px',
                  color: 'var(--fg-color-2)',
                  lineHeight: '1.4'
                }}>
                  {result.snippet}
                </div>
              )}
            </div>
          ))}

          {!query && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--fg-color-2)'
            }}>
              {t.typeToSearch}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Search Button - Icon only */}
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
          color: 'var(--fg-color-icon)'
        }}
        onClick={openModal}
        title={t.search}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-color-1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <IoSearchOutline />
      </button>

      {/* Search Modal - Rendered using Portal */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        modalContent,
        document.body
      )}
    </>
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
      
      {/* Right side - Social buttons, language selector, theme toggle, and search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PageSocial variant="header" />
        <LanguageSwitcher />
        <ToggleThemeButton />
        <SearchButton />
      </div>
    </div>
  )
} 