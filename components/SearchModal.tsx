import { IoSearchOutline, IoCloseCircleOutline } from 'react-icons/io5'
import Link from 'next/link'
import React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'next-i18next'

import { isSearchEnabled, NotionDbList } from '@/lib/config'
import styles from '@/styles/components/SearchModal.module.css'

interface SearchResult {
  id: string
  title: string
  type: string
  url: string
  breadcrumb: Array<{ title: string }> | null
}

interface NotionSearchResponse {
  results: SearchResult[]
}

export function SearchModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { t } = useTranslation('common')

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const openModal = React.useCallback(() => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
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
      // Search across all databases in NotionDbList
      const searchPromises = NotionDbList.map(db =>
        fetch('/api/search-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, ancestorId: db.id })
        }).then(response => response.ok ? response.json() as Promise<NotionSearchResponse> : null)
      )
      
      const allResults = await Promise.all(searchPromises)
      const combinedResults = allResults
        .filter(result => result !== null)
        .flatMap(result => result.results || [])
        // Remove duplicates based on ID
        .filter((result, index, self) => 
          index === self.findIndex(r => r.id === result.id)
        )
      
      setResults(combinedResults)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  // Debounce search query
  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (mounted) {
        void handleSearch(query)
      }
    }, 300) // 300ms debounce delay

    return () => clearTimeout(debounceTimer)
  }, [query, mounted, handleSearch])

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
          {query && (
            <button className={styles.clearButton} onClick={() => setQuery('')}>
              <IoCloseCircleOutline />
            </button>
          )}
        </div>
        <div className={styles.searchResultsList}>
          {isLoading ? (
            <div className={styles.loadingSpinner}>{t('searching')}</div>
          ) : query ? (
            <>
              <div className={styles.searchResultsCount}>
                {t('resultsCount', { count: results.length })}
              </div>
              {results.length > 0 ? (
                results.map((result) => (
                  <div key={result.id} className={styles.searchResultItem}>
                    <Link href={result.url} onClick={closeModal} className={styles.searchResultLink}>
                      <div className={styles.pageTypeTag}
                           style={{ backgroundColor: `var(--tag-color-${result.type.toLowerCase()})` }}>
                        {result.type}
                      </div>
                      <div className={styles.searchResultTextContainer}>
                        <span className={styles.searchResultTitle}>
                          {result.title}
                        </span>
                        {result.breadcrumb && result.breadcrumb.length > 0 && (
                          <div className={styles.searchResultBreadcrumb}>
                            {result.breadcrumb
                              .map((crumb) => crumb.title)
                              .join(' › ')}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className={styles.searchMessage}>{t('noResults')}</div>
              )}
            </>
          ) : (
            <div className={styles.searchMessage}>{t('typeToSearch')}</div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button className="glass-item" onClick={openModal} title={t('search')}>
        <IoSearchOutline />
      </button>
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  )
}
