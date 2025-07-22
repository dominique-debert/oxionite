import { IoCloseCircleOutline } from '@react-icons/all-files/io5/IoCloseCircleOutline'
import { IoMenuOutline } from '@react-icons/all-files/io5/IoMenuOutline'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSearchOutline } from '@react-icons/all-files/io5/IoSearchOutline'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getBlockTitle, parsePageId } from 'notion-utils'
import React from 'react'
import { createPortal } from 'react-dom'

import type * as types from '@/lib/types'
import { isSearchEnabled } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
import { useDarkMode } from '@/lib/use-dark-mode'
import styles from '@/styles/components/SearchModal.module.css'

import siteConfig from '../site.config'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageSocial } from './PageSocial'

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

interface SearchResult {
  id: string
  title: string
  type: string
  url: string
  breadcrumb: string | null
}

interface NotionSearchResponse {
  results: SearchResult[]
}

function SearchButton() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const t = useI18n(router.locale || 'ko')

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const openModal = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const closeModal = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/search-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, ancestorId: siteConfig.rootNotionPageId })
      })
      if (response.ok) {
        const data = (await response.json()) as NotionSearchResponse
        setResults(data.results || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  if (!isSearchEnabled) return null

  const modalContent = (
    <div className={styles.searchModalOverlay} onClick={closeModal}>
      <div className={styles.searchModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchInputWrapper}>
          <IoSearchOutline className={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            className={styles.searchInput}
            onChange={(e) => {
              setQuery(e.target.value)
              handleSearch(e.target.value)
            }}
            placeholder={t.searchPlaceholder}
          />
          {query && (
            <button
              className={styles.clearButton}
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
            >
              <IoCloseCircleOutline />
            </button>
          )}
        </div>

        {!isLoading && query && (
          <div className={styles.searchResultsCount}>
            {t.resultsCount(results.length)}
          </div>
        )}

        <div className={styles.searchResultsList}>
          {isLoading && <div className={styles.loadingSpinner}>Loading...</div>}
          {!isLoading && query && results.length === 0 && <div className={styles.searchMessage}>{t.noResults}</div>}
          {!isLoading && !query && <div className={styles.searchMessage}>{t.typeToSearch}</div>}
          {!isLoading &&
            results.map((result) => {
              const pageTypeClass =
                styles[`pageTypeTag${result.type}`] || styles.pageTypeTagSubPage

              return (
                <div key={result.id} className={styles.searchResultItem}>
                  <a
                    href={result.url}
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(result.url)
                      closeModal()
                    }}
                  >
                    <span className={`${styles.pageTypeTag} ${pageTypeClass}`}>
                      {result.type}
                    </span>
                    <div className={styles.searchResultTextContainer}>
                      <span className={styles.searchResultTitle}>
                        {result.title}
                      </span>
                      {result.breadcrumb && (
                        <span className={styles.searchResultBreadcrumb}>
                          {result.breadcrumb}
                        </span>
                      )}
                    </div>
                  </a>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button className="glass-item" onClick={openModal} title={t.search}>
        <IoSearchOutline />
      </button>
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  )
}

interface BreadcrumbItem {
  title: string
  pageInfo?: types.PageInfo
  href?: string
}

interface TopNavProps {
  pageProps: types.PageProps
  isMobile?: boolean
  onToggleMobileMenu?: () => void
}

export function TopNav({ pageProps, isMobile = false, onToggleMobileMenu }: TopNavProps) {
  const { siteMap, pageId, recordMap, topLevelPageInfo } = pageProps
  const { isDarkMode } = useDarkMode()
  const router = useRouter()

  const breadcrumbs = React.useMemo((): BreadcrumbItem[] => {
    if (!siteMap || !pageId || !topLevelPageInfo || !recordMap) return []

    // 1. Find the base path for the top-level post from the siteMap tree
    const findPagePath = (
      pageId: string,
      tree: types.PageInfo[]
    ): BreadcrumbItem[] | null => {
      for (const item of tree) {
        const currentPath = [
          {
            title: item.title || 'Untitled',
            pageInfo: item,
            href: `/${item.slug}`
          }
        ]
        if (item.pageId === pageId) return currentPath
        if (item.children) {
          const subPath = findPagePath(pageId, item.children)
          if (subPath) return [...currentPath, ...subPath]
        }
      }
      return null
    }

    const basePath =
      findPagePath(topLevelPageInfo.pageId, siteMap.navigationTree || []) || []

    // 2. Build the hierarchical path for sub-pages from the URL slug array
    const slugParts = (router.query.slug as string[]) || []
    const subPageCrumbs: BreadcrumbItem[] = []

    if (slugParts.length > 1) {
      // Iterate from the first sub-page slug to the last one
      for (let i = 1; i < slugParts.length; i++) {
        const subPageSlug = slugParts[i]
        const subPageId = parsePageId(subPageSlug)

        if (subPageId && recordMap.block[subPageId]?.value) {
          const subPageBlock = recordMap.block[subPageId].value
          const subPageTitle = getBlockTitle(subPageBlock, recordMap) || 'Untitled'

          // Construct the full path for the link
          const href = `/${slugParts.slice(0, i + 1).join('/')}`

          subPageCrumbs.push({
            title: subPageTitle,
            href
          })
        }
      }
    }

    return [...basePath, ...subPageCrumbs]
  }, [siteMap, pageId, recordMap, topLevelPageInfo, router.query.slug])

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
        {isMobile && onToggleMobileMenu && (
          <MobileMenuButton onToggle={onToggleMobileMenu} />
        )}
        <div className="glass-breadcrumb">
          <Link href="/" className="breadcrumb-item">
            {siteConfig.name}
          </Link>
          {!isMobile &&
            breadcrumbs.map((crumb, index) => {
              const isLastCrumb = index === breadcrumbs.length - 1
              return (
                <React.Fragment key={index}>
                  <span className="breadcrumb-separator">›</span>
                  {isLastCrumb || !crumb.href ? (
                    <span className="breadcrumb-item is-active">
                      {crumb.title}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="breadcrumb-item">
                      {crumb.title}
                    </Link>
                  )}
                </React.Fragment>
              )
            })}
            
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {!isMobile && <PageSocial variant="header" />}
        <LanguageSwitcher />
        <ToggleThemeButton />
        <SearchButton />
      </div>
    </nav>
  )
}