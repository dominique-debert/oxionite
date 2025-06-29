'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IoChevronDown } from '@react-icons/all-files/io5/IoChevronDown'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import type { PageInfo } from '@/lib/types'
import { isSearchEnabled } from '@/lib/config'
import { useI18n } from '@/lib/i18n'
import siteConfig from '../site.config'
import styles from './CategoryTree.module.css'

interface CategoryTreeProps {
  items: PageInfo[]
  level?: number
  block?: any // For search functionality
}

interface CategoryItemProps {
  item: PageInfo
  level: number
}

interface SearchResult {
  id: string
  title: string
  url: string
  snippet?: string
}

// Utility function to count posts recursively
const countPostsRecursively = (item: PageInfo): number => {
  let count = 0
  
  // If this item is a post, count it
  if (item.type === 'Post') {
    count = 1
  }
  
  // Recursively count posts in children
  if (item.children && item.children.length > 0) {
    count += item.children.reduce((total, child) => {
      return total + countPostsRecursively(child)
    }, 0)
  }
  
  return count
}

// Custom Search Component
const CustomSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Get texts for current locale
  const t = useI18n(router.locale || 'ko')

  const openModal = useCallback(() => {
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }, [])

  const handleSearch = useCallback(async (searchQuery: string) => {
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
        
        // Let's check what each result looks like
        if (data.results && data.results.length > 0) {
          console.log('First result structure:', data.results[0])
          console.log('RecordMap blocks:', data.recordMap?.block)
        }
        
        // Transform results to our format using recordMap data
        const transformedResults: SearchResult[] = data.results?.map((result: any) => {
          const blockId = result.id
          const block = data.recordMap?.block?.[blockId]?.value
          
          console.log(`Block ${blockId}:`, block)
          
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }, [handleSearch])

  const handleResultClick = useCallback((url: string) => {
    closeModal()
    router.push(url)
  }, [closeModal, router])

  // Close modal on escape key
  useEffect(() => {
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

  return (
    <>
      {/* Search Button - styled like react-notion-x Search */}
      <div 
        className={`breadcrumb button ${styles.searchButton}`}
        onClick={openModal}
      >
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        {t.search}
      </div>

      {/* Search Modal */}
      {isOpen && (
        <div
          className={styles.modalOverlay}
          onClick={closeModal}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className={styles.searchInputContainer}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={t.searchPlaceholder}
                className={styles.searchInput}
              />
            </div>

            {/* Search Results */}
            <div className={styles.searchResults}>
              {isLoading && (
                <div className={styles.searchStatus}>
                  {t.searching}
                </div>
              )}

              {!isLoading && query && results.length === 0 && (
                <div className={styles.searchStatus}>
                  {t.noResults}
                </div>
              )}

              {!isLoading && results.map((result) => (
                <div
                  key={result.id}
                  className={styles.searchResultItem}
                  onClick={() => handleResultClick(result.url)}
                >
                  <div className={styles.searchResultTitle}>
                    {result.title}
                  </div>
                  {result.snippet && (
                    <div className={styles.searchResultSnippet}>
                      {result.snippet}
                    </div>
                  )}
                </div>
              ))}

              {!query && (
                <div className={styles.searchStatus}>
                  {t.typeToSearch}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, level }) => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed to avoid hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isCategory = item.type === 'Category'
  const router = useRouter()
  
  // Expand all categories after component mounts to avoid hydration issues
  useEffect(() => {
    setHasMounted(true)
    if (hasChildren) {
      setIsExpanded(true)
    }
  }, [hasChildren])
  
  // Get current locale or default to 'en'
  const locale = router.locale || 'en'
  
  // Generate URL: /locale/slug
  const pageUrl = `/${locale}/${item.slug}`

  // Count posts in this category (only for categories)
  const postCount = isCategory ? countPostsRecursively(item) : 0

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <div
        className={styles.categoryItemContainer}
        style={{
          paddingLeft: `${level * 20 + 8}px`, // Level-based indentation + base padding
        }}
      >
        {/* Expand/Collapse Arrow Button */}
        {hasChildren && (
          <button
            onClick={toggleExpanded}
            className={styles.expandButton}
          >
            {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
          </button>
        )}
        
        {/* Category/Post Content */}
        {isCategory ? (
          <Link 
            href={pageUrl}
            className={styles.categoryLink}
          >
            <span 
              className={`${styles.categoryTitle} ${hasChildren ? styles.categoryTitleWithChildren : styles.categoryTitleWithoutChildren}`}
            >
              {item.title}
            </span>
            {postCount > 0 && (
              <span className={styles.postCount}>
                {postCount}
              </span>
            )}
          </Link>
        ) : (
          <Link 
            href={pageUrl} 
            className={styles.postLink}
          >
            {item.title}
          </Link>
        )}
      </div>

      {isExpanded && hasChildren && (
        <CategoryTree items={item.children} level={(level || 0) + 1} />
      )}
    </div>
  )
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({ 
  items, 
  level = 0, 
  block 
}) => {
  return (
    <div>
      {/* Custom Search - only show at top level */}
      {level === 0 && isSearchEnabled && (
        <CustomSearch />
      )}

      {/* Category Items */}
      {items?.map((item) => (
        <CategoryItem key={item.pageId} item={item} level={level} />
      ))}
    </div>
  )
} 